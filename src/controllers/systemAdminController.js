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
        .select('id, name, congregation_name, is_active, created_at')
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
        .select('id, name, congregation_name, is_active, created_at')
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
        .select('id, name, congregation_name, is_active, created_at')
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
        .select('id, name, congregation_name, is_active, created_at')
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
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
