const { supabase, supabaseAdmin } = require('../config/supabase');
const { assertMemberLimitNotReached } = require('../services/memberLimitService');

const profilesController = {
  // GET /api/profiles/staff-assignments
  // Perfiles de la empresa con sus assignments reales, que viven en
  // auth.users.user_metadata (la columna profiles.assignments está vacía).
  // Devuelve solo campos mínimos (sin email/teléfono/DNI): lo usa el front
  // para contar obreros por departamento.
  getStaffAssignments: async (req, res, next) => {
    try {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, role, department_id, assigned_class')
        .eq('company_id', req.companyId);
      if (error) throw error;

      const ids = new Set((profiles || []).map(p => p.id));
      const metaById = {};
      let page = 1;
      // listUsers es cross-tenant: solo tomamos metadata de los ids de esta empresa
      while (true) {
        const { data, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr) throw listErr;
        const users = data?.users || [];
        users.forEach(u => { if (ids.has(u.id)) metaById[u.id] = u.user_metadata?.assignments || []; });
        if (users.length < 1000) break;
        page++;
      }

      res.json({
        success: true,
        data: (profiles || []).map(p => ({ ...p, assignments: metaById[p.id] || [] })),
      });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/profiles/:id/clear-member-departments
  // El usuario dejó de trabajar (rol "miembro"): su ficha de miembro sale de todos los
  // departamentos. Sigue contando como miembro de la congregación, pero fuera de
  // asistencia, ausencias y cobertura.
  clearMemberDepartments: async (req, res, next) => {
    try {
      const { id } = req.params;
      const role = req.profile?.role;
      if (role !== 'admin' && role !== 'secretaria') {
        return res.status(403).json({ success: false, message: 'Solo admin o secretaría pueden hacer esto' });
      }

      const { data: student, error: studentErr } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('profile_id', id)
        .eq('company_id', req.companyId)
        .is('deleted_at', null)
        .maybeSingle();
      if (studentErr) throw studentErr;
      if (!student) return res.json({ success: true, cleared: false });

      const { error: delErr } = await supabaseAdmin
        .from('student_departments')
        .delete()
        .eq('student_id', student.id)
        .eq('company_id', req.companyId);
      if (delErr) throw delErr;

      const { error: updErr } = await supabaseAdmin
        .from('students')
        .update({ department_id: null, department: null, assigned_class: null })
        .eq('id', student.id)
        .eq('company_id', req.companyId);
      if (updErr) throw updErr;

      res.json({ success: true, cleared: true, student_id: student.id });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/profiles/:id/convert-to-member
  // La persona deja de trabajar en la iglesia: se le borra la cuenta de usuario pero se
  // conserva como miembro de la congregación (registro en `students`, sin departamento).
  // Si ya tenía un student vinculado se lo desvincula; si no, se crea con los datos del perfil.
  convertToMember: async (req, res, next) => {
    try {
      const { id } = req.params;
      const role = req.profile?.role;
      if (role !== 'admin' && role !== 'secretaria') {
        return res.status(403).json({ success: false, message: 'Solo admin o secretaría pueden convertir un usuario en miembro' });
      }
      if (id === req.user?.id) {
        return res.status(400).json({ success: false, message: 'No podés convertir tu propia cuenta' });
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, birthdate, gender, phone, address, document_number, company_id')
        .eq('id', id)
        .eq('company_id', req.companyId)
        .maybeSingle();
      if (profileErr) throw profileErr;
      if (!profile) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

      const { data: student, error: studentErr } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('profile_id', id)
        .eq('company_id', req.companyId)
        .is('deleted_at', null)
        .maybeSingle();
      if (studentErr) throw studentErr;

      let studentId;
      if (student) {
        // Desvincular ANTES de borrar el profile: si la FK fuera ON DELETE CASCADE,
        // borrar el usuario se llevaría puesto al miembro.
        const { error: unlinkErr } = await supabaseAdmin
          .from('students')
          .update({ profile_id: null })
          .eq('id', student.id)
          .eq('company_id', req.companyId);
        if (unlinkErr) throw unlinkErr;
        studentId = student.id;
      } else {
        await assertMemberLimitNotReached(req.companyId);
        const { data: created, error: createErr } = await supabaseAdmin
          .from('students')
          .insert({
            first_name: profile.first_name,
            last_name: profile.last_name || '',
            birthdate: profile.birthdate || null,
            gender: profile.gender || 'masculino',
            phone: profile.phone || null,
            address: profile.address || null,
            document_number: profile.document_number || null,
            company_id: req.companyId,
          })
          .select('id')
          .single();
        if (createErr) throw createErr;
        studentId = created.id;
      }

      const { error: delProfileErr } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', id)
        .eq('company_id', req.companyId);
      if (delProfileErr) throw delProfileErr;

      const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (delAuthErr) {
        console.error(`⚠️ [profiles] Perfil ${id} borrado pero falló el borrado del usuario de auth:`, delAuthErr.message);
      }

      res.json({ success: true, student_id: studentId });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = profilesController;
