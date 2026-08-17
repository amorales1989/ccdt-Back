const { supabase, supabaseAdmin } = require('../config/supabase');
const { assertMemberLimitNotReached } = require('../services/memberLimitService');

// --- Suspensión de cuentas ---------------------------------------------------------------
// Quién puede suspender y sobre quién. El scope sale SIEMPRE de req.profile (server-side),
// nunca del body/query. Mismo criterio que allowedDeptIds() en accountingController.
const GLOBAL_MANAGERS = ['admin', 'secretaria'];                            // toda la congregación
const DEPT_MANAGERS = ['director', 'vicedirector', 'director_general'];     // solo sus departamentos
const NEVER_SUSPENDABLE = ['admin', 'secretaria', 'system_admin'];          // nadie los suspende
const PEER_ROLES = ['director', 'vicedirector', 'director_general'];        // intocables para DEPT_MANAGERS

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const err = (message, status) => {
  const e = new Error(message);
  e.status = status;
  return e;
};

// Devuelve null si puede, o el motivo del rechazo. `target` debe venir ya filtrado por company_id.
const suspensionRejection = (req, target) => {
  const actorRole = req.profile?.role;
  if (!GLOBAL_MANAGERS.includes(actorRole) && !DEPT_MANAGERS.includes(actorRole)) {
    return 'No tenés permiso para suspender cuentas';
  }
  if (target.id === req.user?.id) return 'No podés suspender tu propia cuenta';
  if (NEVER_SUSPENDABLE.includes(target.role)) return 'No se puede suspender a este rol';

  if (DEPT_MANAGERS.includes(actorRole)) {
    if (PEER_ROLES.includes(target.role)) return 'No podés suspender a un director o vicedirector';
    // El vínculo perfil↔departamento es doble: department_id (uuid) y departments (nombres).
    const actorDepts = req.profile?.departments || [];
    const targetDepts = target.departments || [];
    const sharesName = targetDepts.some(d => actorDepts.includes(d));
    const sharesId = !!req.profile?.department_id && target.department_id === req.profile.department_id;
    if (!sharesName && !sharesId) return 'El usuario no pertenece a tu departamento';
  }
  return null;
};

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

  // PATCH /api/profiles/:id/suspension  { suspended: boolean }
  // Suspende o reactiva una cuenta. El suspendido conserva rol, departamento y clase:
  // el bloqueo lo aplica authMiddleware en cada request.
  setSuspension: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { suspended } = req.body;
      if (!UUID_RE.test(id || '')) throw err('Id de usuario inválido', 400);
      if (typeof suspended !== 'boolean') throw err('El campo "suspended" debe ser booleano', 400);

      const { data: target, error: targetErr } = await supabaseAdmin
        .from('profiles')
        .select('id, role, departments, department_id')
        .eq('id', id)
        .eq('company_id', req.companyId)
        .maybeSingle();
      if (targetErr) throw targetErr;
      if (!target) throw err('Usuario no encontrado', 404);

      const rejection = suspensionRejection(req, target);
      if (rejection) throw err(rejection, 403);

      const { error: updErr } = await supabaseAdmin
        .from('profiles')
        .update({ suspended })
        .eq('id', id)
        .eq('company_id', req.companyId);
      if (updErr) throw updErr;

      res.json({ success: true, data: { id, suspended } });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/profiles/suspension/bulk
  // { suspended: boolean, user_ids?: string[] }  ó  { suspended: boolean, department_id: uuid }
  // Los targets que no pasan el guard van a `skipped` con su motivo en vez de tirar el request.
  bulkSetSuspension: async (req, res, next) => {
    try {
      const { suspended, user_ids: userIds, department_id: departmentId } = req.body;
      if (typeof suspended !== 'boolean') throw err('El campo "suspended" debe ser booleano', 400);

      const actorRole = req.profile?.role;
      if (!GLOBAL_MANAGERS.includes(actorRole) && !DEPT_MANAGERS.includes(actorRole)) {
        throw err('No tenés permiso para suspender cuentas', 403);
      }

      let query = supabaseAdmin
        .from('profiles')
        .select('id, role, departments, department_id')
        .eq('company_id', req.companyId);

      if (Array.isArray(userIds) && userIds.length > 0) {
        if (userIds.some(uid => !UUID_RE.test(uid || ''))) throw err('Lista de usuarios inválida', 400);
        query = query.in('id', userIds);
      } else if (departmentId) {
        if (!UUID_RE.test(departmentId)) throw err('Id de departamento inválido', 400);
        // El vínculo por nombre (profiles.departments) se resuelve abajo, con el nombre del depto.
        const { data: dept, error: deptErr } = await supabaseAdmin
          .from('departments')
          .select('id, name')
          .eq('id', departmentId)
          .eq('company_id', req.companyId)
          .maybeSingle();
        if (deptErr) throw deptErr;
        if (!dept) throw err('Departamento no encontrado', 404);
        query = query.or(`department_id.eq.${dept.id},departments.cs.{"${dept.name}"}`);
      } else {
        throw err('Indicá "user_ids" o "department_id"', 400);
      }

      const { data: targets, error: targetsErr } = await query;
      if (targetsErr) throw targetsErr;

      const allowed = [];
      const skipped = [];
      (targets || []).forEach(t => {
        const rejection = suspensionRejection(req, t);
        if (rejection) skipped.push({ id: t.id, reason: rejection });
        else allowed.push(t.id);
      });

      if (allowed.length > 0) {
        const { error: updErr } = await supabaseAdmin
          .from('profiles')
          .update({ suspended })
          .in('id', allowed)
          .eq('company_id', req.companyId);
        if (updErr) throw updErr;
      }

      res.json({ success: true, updated: allowed.length, skipped });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = profilesController;
