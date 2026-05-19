const { supabase } = require('../config/supabase');
const NotificationService = require('../services/notificationService');
const WhatsAppService = require('../services/whatsappService');

const ALLOWED_ROLES = ['admin', 'secretaria'];
const STAFF_ROLES = ['lider', 'maestro', 'colaborador', 'ayudante', 'director', 'vicedirector'];

async function getRequesterRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data.role;
}

async function resolveRecipients(target, companyId) {
  // Para 'people' alcanza con un IN sobre id
  if (target.type === 'people') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, phone')
      .eq('company_id', companyId)
      .in('id', target.profile_ids);
    if (error) throw error;
    return data || [];
  }

  // Para department/class/role: traemos todos los profiles de la company con los campos necesarios
  // y filtramos en JS para contemplar role primario, roles[] (multi-rol) y assignments[] (rol+depto)
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, roles, phone, department_id, departments, assigned_class, assignments')
    .eq('company_id', companyId);
  if (error) throw error;

  const all = profiles || [];

  // Helpers
  const getAllRoles = (p) => {
    const set = new Set();
    if (p.role) set.add(p.role);
    if (Array.isArray(p.roles)) p.roles.forEach(r => r && set.add(r));
    if (Array.isArray(p.assignments)) p.assignments.forEach(a => a && a.role && set.add(a.role));
    return set;
  };

  const isInDepartment = (p, deptId) => {
    if (p.department_id === deptId) return true;
    if (Array.isArray(p.assignments) && p.assignments.some(a => a && a.department_id === deptId)) return true;
    return false;
  };

  const isInClass = (p, deptId, className) => {
    if (p.department_id === deptId && p.assigned_class === className) return true;
    if (Array.isArray(p.assignments) && p.assignments.some(a => a && a.department_id === deptId && a.assigned_class === className)) return true;
    return false;
  };

  let filtered = [];
  switch (target.type) {
    case 'department': {
      filtered = all.filter(p => {
        if (!isInDepartment(p, target.department_id)) return false;
        const roles = getAllRoles(p);
        return STAFF_ROLES.some(r => roles.has(r));
      });
      break;
    }
    case 'class': {
      filtered = all.filter(p => {
        if (!isInClass(p, target.department_id, target.assigned_class)) return false;
        const roles = getAllRoles(p);
        return STAFF_ROLES.some(r => roles.has(r));
      });
      break;
    }
    case 'role': {
      const wanted = new Set(target.roles);
      filtered = all.filter(p => {
        const roles = getAllRoles(p);
        for (const r of roles) if (wanted.has(r)) return true;
        return false;
      });
      break;
    }
    default:
      throw Object.assign(new Error('target.type inválido'), { status: 400 });
  }

  // Devolver solo los campos que el resto del flujo usa
  return filtered.map(p => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    role: p.role,
    phone: p.phone,
  }));
}

// POST /api/notifications/broadcast
exports.broadcast = async (req, res, next) => {
  try {
    const requesterRole = await getRequesterRole(req.user.id);
    if (!ALLOWED_ROLES.includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'No tenés permisos para esta acción' });
    }

    const { channel, title, message, target, link } = req.body;
    const linkTrimmed = link && String(link).trim() !== '' ? String(link).trim() : null;

    // Validaciones básicas
    if (!channel || !['push', 'whatsapp'].includes(channel)) {
      return res.status(400).json({ success: false, message: 'channel debe ser "push" o "whatsapp"' });
    }
    if (!message) {
      return res.status(400).json({ success: false, message: 'message es requerido' });
    }
    if (channel === 'push' && !title) {
      return res.status(400).json({ success: false, message: 'title es requerido para channel "push"' });
    }
    if (!target || !target.type) {
      return res.status(400).json({ success: false, message: 'target.type es requerido' });
    }
    if ((target.type === 'department' || target.type === 'class') && !target.department_id) {
      return res.status(400).json({ success: false, message: 'target.department_id es requerido para ese tipo' });
    }
    if (target.type === 'class' && !target.assigned_class) {
      return res.status(400).json({ success: false, message: 'target.assigned_class es requerido para type "class"' });
    }
    if (target.type === 'role' && (!Array.isArray(target.roles) || target.roles.length === 0)) {
      return res.status(400).json({ success: false, message: 'target.roles es requerido para type "role"' });
    }
    if (target.type === 'people' && (!Array.isArray(target.profile_ids) || target.profile_ids.length === 0)) {
      return res.status(400).json({ success: false, message: 'target.profile_ids es requerido para type "people"' });
    }

    const recipients = await resolveRecipients(target, req.companyId);

    const waMessage = linkTrimmed ? `${message}\n\n${linkTrimmed}` : message;

    if (channel === 'whatsapp') {
      const waRecipients = recipients
        .filter(p => p.phone && String(p.phone).trim() !== '')
        .map(p => ({ phone: p.phone, name: `${p.first_name || ''} ${p.last_name || ''}`.trim() }));

      // fire-and-forget
      WhatsAppService.sendBulkMessages(req.companyId, waRecipients, waMessage)
        .then(result => console.log(`[Broadcast WA] companyId=${req.companyId} sent=${result.sent} failed=${result.failed}`))
        .catch(err => console.error('[Broadcast WA] Error en background:', err.message));

      return res.json({
        success: true,
        recipients: recipients.length,
        channel,
        whatsapp: { queued: waRecipients.length }
      });
    }

    // channel === 'push'
    let pushSent = 0;
    const waFallback = [];

    for (const profile of recipients) {
      try {
        // enviarAUsuario retorna { success: false, message: '...' } si no hay tokens (línea 22-24 notificationService.js)
        const result = await NotificationService.enviarAUsuario(
          profile.id,
          { titulo: title, cuerpo: message },
          {},
          linkTrimmed || '/'
        );

        if (result && result.success === false) {
          if (profile.phone && String(profile.phone).trim() !== '') {
            waFallback.push({ phone: profile.phone, name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() });
          }
        } else {
          pushSent++;
        }
      } catch (err) {
        console.error(`[Broadcast Push] Error enviando a ${profile.id}:`, err.message);
        if (profile.phone && String(profile.phone).trim() !== '') {
          waFallback.push({ phone: profile.phone, name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() });
        }
      }
    }

    // Fallback WhatsApp fire-and-forget
    if (waFallback.length > 0) {
      WhatsAppService.sendBulkMessages(req.companyId, waFallback, waMessage)
        .then(result => console.log(`[Broadcast Fallback WA] sent=${result.sent} failed=${result.failed}`))
        .catch(err => console.error('[Broadcast Fallback WA] Error en background:', err.message));
    }

    return res.json({
      success: true,
      recipients: recipients.length,
      channel,
      push: { sent: pushSent, fallbackToWa: waFallback.length },
      whatsapp: { queued: waFallback.length }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/profiles/search?q=xxx
exports.searchProfiles = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim() === '') {
      return res.status(400).json({ success: false, message: 'Parámetro q es requerido' });
    }

    const term = `%${String(q).trim()}%`;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, phone')
      .eq('company_id', req.companyId)
      .or(`first_name.ilike.${term},last_name.ilike.${term}`)
      .limit(10);

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};
