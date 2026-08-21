const { supabaseAdmin } = require('../config/supabase');

// ABM de roles propios de cada empresa (ver migrations/add_company_roles.sql).
// CRUD de una sola tabla sin joins ni agregación: cae en la excepción de la regla 12 (sin SP).
// Scope multi-tenant: TODA query filtra por req.companyId.

// Roles fijos del enum app_role. Ninguna key custom puede colisionar con estos: si lo hiciera,
// heredaría por fallback los permisos de DEFAULT_PERMISSIONS del front (ej. 'admin' = acceso total).
const BUILTIN_ROLES = [
  'admin', 'lider', 'director', 'maestro', 'secretaria', 'colaborador',
  'auxiliar_maestro', 'director_general', 'vicedirector', 'secr.-calendario',
  'conserje', 'miembro', 'system_admin',
];

const PREFIJO = 'custom_';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esAdminOSecretaria(req, res) {
  const roles = [req.profile?.role, ...(req.profile?.roles || [])];
  if (!roles.includes('admin') && !roles.includes('secretaria')) {
    res.status(403).json({ success: false, message: 'Solo el administrador o la secretaría pueden gestionar los roles' });
    return false;
  }
  return true;
}

// 'Coordinador de Jóvenes' -> 'custom_coordinador_de_jovenes'
function derivarKey(label) {
  const slug = label
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug ? `${PREFIJO}${slug}` : '';
}

function validarLabel(label, res) {
  const limpio = typeof label === 'string' ? label.trim() : '';
  if (limpio.length < 2 || limpio.length > 40) {
    res.status(400).json({ success: false, message: 'El nombre del rol debe tener entre 2 y 40 caracteres' });
    return null;
  }
  return limpio;
}

async function getRolePermissions(companyId) {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('role_permissions')
    .eq('id', companyId)
    .single();
  if (error) throw error;
  return data?.role_permissions && typeof data.role_permissions === 'object' ? data.role_permissions : {};
}

// GET /api/company/roles - Lectura para cualquier rol autenticado: los selects de usuarios y las
// etiquetas del sidebar necesitan resolver el label de un rol custom.
exports.listRoles = async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('company_roles')
      .select('id, key, label, created_at')
      .eq('company_id', req.companyId)
      .order('label');
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) { next(error); }
};

// POST /api/company/roles { label }
exports.createRole = async (req, res, next) => {
  try {
    if (!esAdminOSecretaria(req, res)) return;

    const label = validarLabel(req.body?.label, res);
    if (!label) return;

    const key = derivarKey(label);
    if (!key) {
      return res.status(400).json({ success: false, message: 'El nombre del rol debe tener al menos una letra o número' });
    }
    if (BUILTIN_ROLES.includes(key)) {
      return res.status(409).json({ success: false, message: 'Ese nombre corresponde a un rol del sistema' });
    }

    const { data: existente } = await supabaseAdmin
      .from('company_roles')
      .select('id')
      .eq('company_id', req.companyId)
      .eq('key', key)
      .maybeSingle();
    if (existente) {
      return res.status(409).json({ success: false, message: 'Ya existe un rol con ese nombre' });
    }

    const { data, error } = await supabaseAdmin
      .from('company_roles')
      .insert({ company_id: req.companyId, key, label, created_by: req.user.id })
      .select('id, key, label, created_at')
      .single();
    if (error) throw error;

    // Entrada vacía en la matriz: el rol nace sin ningún permiso (deny by default).
    const permisos = await getRolePermissions(req.companyId);
    if (!permisos[key]) {
      permisos[key] = {};
      await supabaseAdmin.from('companies').update({ role_permissions: permisos }).eq('id', req.companyId);
    }

    res.status(201).json({ success: true, data });
  } catch (error) { next(error); }
};

// PATCH /api/company/roles/:id { label } - Solo el nombre visible. La key es inmutable: cambiarla
// dejaría huérfanos los permisos guardados y los profiles.roles que ya la tienen.
exports.updateRole = async (req, res, next) => {
  try {
    if (!esAdminOSecretaria(req, res)) return;
    if (!UUID_RE.test(req.params.id || '')) {
      return res.status(400).json({ success: false, message: 'ID de rol inválido' });
    }

    const label = validarLabel(req.body?.label, res);
    if (!label) return;

    const { data, error } = await supabaseAdmin
      .from('company_roles')
      .update({ label, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .select('id, key, label, created_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Rol no encontrado' });

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

// DELETE /api/company/roles/:id - Bloqueado si hay usuarios con el rol asignado.
exports.deleteRole = async (req, res, next) => {
  try {
    if (!esAdminOSecretaria(req, res)) return;
    if (!UUID_RE.test(req.params.id || '')) {
      return res.status(400).json({ success: false, message: 'ID de rol inválido' });
    }

    const { data: rol, error: rolError } = await supabaseAdmin
      .from('company_roles')
      .select('id, key')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .maybeSingle();
    if (rolError) throw rolError;
    if (!rol) return res.status(404).json({ success: false, message: 'Rol no encontrado' });

    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', req.companyId)
      .contains('roles', [rol.key]);
    if (countError) throw countError;

    if (count > 0) {
      return res.status(409).json({
        success: false,
        code: 'ROL_EN_USO',
        usuarios: count,
        message: `No se puede eliminar: ${count} usuario(s) tienen este rol asignado`,
      });
    }

    const { error } = await supabaseAdmin
      .from('company_roles')
      .delete()
      .eq('id', rol.id)
      .eq('company_id', req.companyId);
    if (error) throw error;

    // Limpieza: sacar la key de la matriz de permisos y de los destinatarios de notificaciones,
    // para que no quede basura si mañana se crea otro rol con el mismo nombre.
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('role_permissions, notification_settings')
      .eq('id', req.companyId)
      .single();

    const permisos = { ...(company?.role_permissions || {}) };
    delete permisos[rol.key];

    const notifs = { ...(company?.notification_settings || {}) };
    for (const evento of Object.keys(notifs)) {
      if (Array.isArray(notifs[evento])) {
        notifs[evento] = notifs[evento].filter((r) => r !== rol.key);
      }
    }

    await supabaseAdmin
      .from('companies')
      .update({ role_permissions: permisos, notification_settings: notifs })
      .eq('id', req.companyId);

    res.json({ success: true });
  } catch (error) { next(error); }
};

// PATCH /api/company/role-permissions { role_permissions }
// Antes el front escribía companies directo con la anon key: cualquiera podía auto-otorgarse
// permisos si la RLS de companies no lo frenaba.
exports.updateRolePermissions = async (req, res, next) => {
  try {
    if (!esAdminOSecretaria(req, res)) return;

    const entrada = req.body?.role_permissions;
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
      return res.status(400).json({ success: false, message: 'role_permissions debe ser un objeto' });
    }

    const { data: custom, error: customError } = await supabaseAdmin
      .from('company_roles')
      .select('key')
      .eq('company_id', req.companyId);
    if (customError) throw customError;

    const permitidas = new Set([...BUILTIN_ROLES, ...(custom || []).map((r) => r.key)]);

    // Solo keys de roles conocidos y valores booleanos: no dejamos inyectar roles arbitrarios
    // ni payloads con estructura libre dentro del JSON de la empresa.
    const limpio = {};
    for (const [rol, permisos] of Object.entries(entrada)) {
      if (!permitidas.has(rol) || !permisos || typeof permisos !== 'object' || Array.isArray(permisos)) continue;
      limpio[rol] = {};
      for (const [clave, valor] of Object.entries(permisos)) {
        limpio[rol][clave] = valor === true;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({ role_permissions: limpio })
      .eq('id', req.companyId)
      .select('role_permissions')
      .single();
    if (error) throw error;

    res.json({ success: true, data: data.role_permissions });
  } catch (error) { next(error); }
};
