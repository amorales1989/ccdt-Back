const { supabaseAdmin } = require('../config/supabase');

// Panel del super admin. Todas las operaciones son legitimamente CROSS-TENANT
// (gestionan todas las empresas), por eso usan supabaseAdmin y NO filtran por req.companyId.
// El acceso se restringe exigiendo rol system_admin en cada handler.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ensureSystemAdmin(req, res) {
  if (req.profile?.role !== 'system_admin') {
    res.status(403).json({ success: false, message: 'Acceso restringido al administrador del sistema' });
    return false;
  }
  return true;
}

const systemAdminController = {
  // GET /api/system/companies
  listCompanies: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;

      const { data: companies, error } = await supabaseAdmin
        .from('companies')
        .select('id, name, congregation_name, is_active, created_at, plan, extra_member_packs, billing_cycle, last_payment_date, due_date')
        .order('id');
      if (error) throw error;

      // Conteo de usuarios (profiles) por empresa
      const { data: profiles, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('company_id');
      if (pErr) throw pErr;

      const userCounts = {};
      for (const p of profiles) {
        if (p.company_id != null) userCounts[p.company_id] = (userCounts[p.company_id] || 0) + 1;
      }

      // Conteo de miembros (students) por empresa (excluye eliminados)
      const { data: students, error: sErr } = await supabaseAdmin
        .from('students')
        .select('company_id')
        .is('deleted_at', null);
      if (sErr) throw sErr;

      const memberCounts = {};
      for (const s of students) {
        if (s.company_id != null) memberCounts[s.company_id] = (memberCounts[s.company_id] || 0) + 1;
      }

      const data = companies.map((c) => ({
        ...c,
        user_count: userCounts[c.id] || 0,
        member_count: memberCounts[c.id] || 0,
      }));
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/system/companies
  createCompany: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;

      const { name, congregation_name } = req.body || {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'El nombre de la empresa es obligatorio' });
      }

      const { data, error } = await supabaseAdmin
        .from('companies')
        .insert({ name: name.trim(), congregation_name: congregation_name?.trim() || null })
        .select('id, name, congregation_name, is_active, created_at, plan, extra_member_packs, billing_cycle, last_payment_date, due_date')
        .single();
      if (error) throw error;

      res.status(201).json({ success: true, data: { ...data, user_count: 0, member_count: 0 } });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/system/companies/:id
  updateCompany: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;

      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'ID de empresa inválido' });
      }
      const { name, congregation_name } = req.body || {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'El nombre de la empresa es obligatorio' });
      }

      const { data, error } = await supabaseAdmin
        .from('companies')
        .update({ name: name.trim(), congregation_name: congregation_name?.trim() || null })
        .eq('id', id)
        .select('id, name, congregation_name, is_active, created_at, plan, extra_member_packs, billing_cycle, last_payment_date, due_date')
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/system/companies/:id
  deleteCompany: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;

      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'ID de empresa inválido' });
      }

      // Seguridad: no permitir borrar empresas con datos asociados (evita pérdida masiva).
      const { count: userCount } = await supabaseAdmin
        .from('profiles').select('id', { count: 'exact', head: true }).eq('company_id', id);
      const { count: memberCount } = await supabaseAdmin
        .from('students').select('id', { count: 'exact', head: true }).eq('company_id', id).is('deleted_at', null);

      if ((userCount || 0) > 0 || (memberCount || 0) > 0) {
        return res.status(409).json({
          success: false,
          message: `No se puede eliminar: la empresa tiene ${userCount || 0} usuario(s) y ${memberCount || 0} miembro(s). Eliminá o reasigná esos datos primero.`,
        });
      }

      const { error } = await supabaseAdmin.from('companies').delete().eq('id', id);
      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/system/companies/:id/status
  setCompanyStatus: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;

      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'ID de empresa inválido' });
      }
      const { is_active } = req.body || {};
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ success: false, message: 'is_active debe ser booleano' });
      }

      const { data, error } = await supabaseAdmin
        .from('companies')
        .update({ is_active })
        .eq('id', id)
        .select('id, name, congregation_name, is_active, created_at, plan, extra_member_packs, billing_cycle, last_payment_date, due_date')
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/system/companies/:id/plan
  setCompanyPlan: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;

      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'ID de empresa inválido' });
      }
      const { plan } = req.body || {};
      if (plan != null && typeof plan !== 'string') {
        return res.status(400).json({ success: false, message: 'plan inválido' });
      }

      const { data, error } = await supabaseAdmin
        .from('companies')
        .update({ plan: plan || null })
        .eq('id', id)
        .select('id, name, congregation_name, is_active, created_at, plan, extra_member_packs, billing_cycle, last_payment_date, due_date')
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/system/companies/:id/packs
  setCompanyPacks: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'ID de empresa inválido' });
      const packs = parseInt(req.body?.extra_member_packs, 10);
      if (!Number.isInteger(packs) || packs < 0) return res.status(400).json({ success: false, message: 'extra_member_packs debe ser un entero >= 0' });
      const { data, error } = await supabaseAdmin
        .from('companies')
        .update({ extra_member_packs: packs })
        .eq('id', id)
        .select('id, name, congregation_name, is_active, created_at, plan, extra_member_packs, billing_cycle, last_payment_date, due_date')
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  // POST /api/system/companies/:id/payments
  recordPayment: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'ID de empresa inválido' });
      const amount = Number(req.body?.amount);
      const billing_cycle = req.body?.billing_cycle === 'anual' ? 'anual' : 'mensual';
      const source = typeof req.body?.source === 'string' ? req.body.source : 'manual';
      const notes = typeof req.body?.notes === 'string' ? req.body.notes : null;
      if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ success: false, message: 'Monto inválido' });

      // Fecha de pago: opcional (ej. pagó ayer y lo registro hoy). Default: hoy.
      const paymentDate = typeof req.body?.payment_date === 'string' ? req.body.payment_date : null;
      if (paymentDate && !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
        return res.status(400).json({ success: false, message: 'Fecha de pago inválida (formato YYYY-MM-DD)' });
      }

      // Traer due_date actual para stackear si aún no venció
      const { data: comp, error: cErr } = await supabaseAdmin.from('companies').select('due_date').eq('id', id).single();
      if (cErr) throw cErr;
      if (!comp) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });

      const todayStr = paymentDate || new Date().toISOString().slice(0, 10);
      const base = (comp.due_date && comp.due_date > todayStr) ? new Date(comp.due_date) : new Date(todayStr);
      const periodStart = new Date(base);
      const periodEnd = new Date(base);
      if (billing_cycle === 'anual') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);
      const due = periodEnd.toISOString().slice(0, 10);

      const { error: payErr } = await supabaseAdmin.from('payments').insert({
        company_id: id, amount, billing_cycle, source, notes,
        period_start: periodStart.toISOString().slice(0, 10), period_end: due,
      });
      if (payErr) throw payErr;

      const { data, error } = await supabaseAdmin.from('companies')
        .update({ last_payment_date: todayStr, due_date: due, billing_cycle, is_active: true })
        .eq('id', id)
        .select('id, name, congregation_name, is_active, created_at, plan, extra_member_packs, billing_cycle, last_payment_date, due_date')
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  // GET /api/system/companies/:id/payments
  getCompanyPayments: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: 'ID de empresa inválido' });
      const { data, error } = await supabaseAdmin.from('payments')
        .select('*').eq('company_id', id).order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (error) { next(error); }
  },

  // GET /api/system/plans
  getPlans: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;
      const { data, error } = await supabaseAdmin.from('plans').select('*').order('sort');
      if (error) throw error;
      res.json({ success: true, data: data || [] });
    } catch (error) { next(error); }
  },

  // PUT /api/system/plans/:value
  updatePlan: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;
      const { value } = req.params;
      const price_monthly = Number(req.body?.price_monthly);
      const pack_price_monthly = Number(req.body?.pack_price_monthly);
      if (!Number.isFinite(price_monthly) || price_monthly < 0) {
        return res.status(400).json({ success: false, message: 'price_monthly inválido' });
      }
      if (!Number.isFinite(pack_price_monthly) || pack_price_monthly < 0) {
        return res.status(400).json({ success: false, message: 'pack_price_monthly inválido' });
      }
      const { data, error } = await supabaseAdmin
        .from('plans')
        .update({ price_monthly, pack_price_monthly })
        .eq('value', value)
        .select('*')
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Plan no encontrado' });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  // GET /api/system/companies/:id/admins
  listCompanyAdmins: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;

      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'ID de empresa inválido' });
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('company_id', id)
        .eq('role', 'admin')
        .order('first_name');
      if (error) throw error;

      res.json({ success: true, data: data || [] });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/system/companies/:id/admin
  createCompanyAdmin: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;

      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ success: false, message: 'ID de empresa inválido' });
      }
      const { email, password, first_name, last_name } = req.body || {};
      if (!email || !EMAIL_RE.test(email)) {
        return res.status(400).json({ success: false, message: 'Email inválido' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
      }

      // La empresa debe existir
      const { data: company, error: cErr } = await supabaseAdmin
        .from('companies').select('id').eq('id', id).single();
      if (cErr || !company) {
        return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
      }

      const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authErr) {
        return res.status(400).json({ success: false, message: authErr.message });
      }

      const userId = created.user.id;
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email,
          first_name: first_name?.trim() || 'Admin',
          last_name: last_name?.trim() || null,
          role: 'admin',
          company_id: id,
        });
      if (profileErr) throw profileErr;

      res.status(201).json({ success: true, data: { id: userId, email, role: 'admin', company_id: id } });
    } catch (error) {
      next(error);
    }
  },

  // PATCH /api/system/admins/:userId/password
  updateAdminPassword: async (req, res, next) => {
    try {
      if (!ensureSystemAdmin(req, res)) return;

      const { userId } = req.params;
      const { password } = req.body || {};
      if (!userId) {
        return res.status(400).json({ success: false, message: 'userId requerido' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
      }

      // Validar que el target sea un admin de alguna empresa
      const { data: target, error: tErr } = await supabaseAdmin
        .from('profiles').select('id, role').eq('id', userId).single();
      if (tErr || !target) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }
      if (target.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Solo se puede cambiar la contraseña de un admin' });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) {
        return res.status(400).json({ success: false, message: error.message });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = systemAdminController;
