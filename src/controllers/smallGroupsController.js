const { supabase } = require('../config/supabase');
const { assertMemberLimitNotReached } = require('../services/memberLimitService');

// Administran (crear/editar/archivar/roster) TODOS los grupos de la empresa, cualquier depto.
const GLOBAL_VISIBILITY_ROLES = ['admin', 'secretaria'];

// Ven y administran todos los grupos de SUS departamentos asignados (no solo los que lideran).
const DEPT_VISIBILITY_ROLES = ['director', 'vicedirector', 'director_general'];

// Roles que pueden crear grupos ATADOS a su propio departamento (sin ser admin).
// El grupo queda scoped a ese department_id: solo se le pueden agregar personas del mismo depto.
// Maestro/auxiliar_maestro NO crean grupos, pero sí pueden quedar a cargo de uno (como leader/co_leader)
// vía small_group_members — eso no depende de este rol global, sino de la membresía del grupo.
const DEPT_LEADER_ROLES = ['lider'];

// ¿El usuario es leader/co_leader ACTIVO de este grupo puntual? (distinto del rol global del perfil)
const isGroupLeader = async (groupId, profileId, companyId) => {
    const { data } = await supabase
        .from('small_group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('profile_id', profileId)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .in('role_in_group', ['leader', 'co_leader'])
        .maybeSingle();
    return !!data;
};

// ¿El usuario tiene CUALQUIER membresía activa en este grupo (leader/co_leader/member)?
const isActiveMember = async (groupId, profileId, companyId) => {
    const { data } = await supabase
        .from('small_group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('profile_id', profileId)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .maybeSingle();
    return !!data;
};

// department_id que el usuario puede VER/ADMINISTRAR por su rol: lider -> el suyo; director-level
// -> los asignados a su perfil (por nombre, igual que el resto de la app). null = sin alcance por
// departamento; en ese caso solo accede a los grupos de los que ya es miembro (cualquier rol).
const resolveVisibleDepartmentIds = async (req) => {
    if (req.profile?.role === 'lider' && req.profile?.department_id) {
        return new Set([req.profile.department_id]);
    }
    if (DEPT_VISIBILITY_ROLES.includes(req.profile?.role)) {
        const names = req.profile?.departments || [];
        if (names.length === 0) return new Set();
        const { data: depts } = await supabase
            .from('departments')
            .select('id')
            .eq('company_id', req.companyId)
            .in('name', names);
        return new Set((depts || []).map((d) => d.id));
    }
    return null;
};

const getGroupDepartmentId = async (groupId, companyId) => {
    const { data } = await supabase
        .from('small_groups')
        .select('department_id')
        .eq('id', groupId)
        .eq('company_id', companyId)
        .maybeSingle();
    return data?.department_id || null;
};

const canManageGroup = async (req, groupId) => {
    if (GLOBAL_VISIBILITY_ROLES.includes(req.profile?.role)) return true;
    // Alcance por departamento: lider (su depto) y director-level (deptos asignados) gestionan
    // TODOS los grupos de su(s) depto(s), no solo los que lideran personalmente.
    const [deptId, allowed] = await Promise.all([
        getGroupDepartmentId(groupId, req.companyId),
        resolveVisibleDepartmentIds(req),
    ]);
    if (deptId && allowed && allowed.has(deptId)) return true;
    // Resto (maestro/auxiliar/colaborador): solo si están a cargo de ESE grupo puntual.
    return isGroupLeader(groupId, req.user.id, req.companyId);
};

const notFound = () => {
    const err = new Error('Grupo no encontrado');
    err.status = 404;
    return err;
};

// Un grupo archivado queda de solo lectura: nada de roster/reuniones/asistencia hasta reactivarlo.
const assertGroupNotArchived = async (groupId, companyId) => {
    const { data } = await supabase
        .from('small_groups')
        .select('status')
        .eq('id', groupId)
        .eq('company_id', companyId)
        .maybeSingle();
    if (data?.status === 'archived') {
        const err = new Error('Este grupo está archivado. Reactivalo antes de hacer cambios.');
        err.status = 409;
        err.code = 'GROUP_ARCHIVED';
        throw err;
    }
};

// Adjunta `leaders` (perfiles con role_in_group leader/co_leader activos) y `member_count`
// (TODOS los miembros activos, incluidos los que están a cargo) a cada grupo, sin que el
// front tenga que pedir el roster completo para mostrar la card.
const attachLeaders = async (groups, companyId) => {
    if (groups.length === 0) return groups;
    const { data: memberRows } = await supabase
        .from('small_group_members')
        .select('group_id, role_in_group, profile:profiles!small_group_members_profile_id_fkey(id, first_name, last_name)')
        .in('group_id', groups.map((g) => g.id))
        .eq('company_id', companyId)
        .eq('status', 'active');

    const leadersByGroup = new Map();
    const countByGroup = new Map();
    (memberRows || []).forEach((r) => {
        countByGroup.set(r.group_id, (countByGroup.get(r.group_id) || 0) + 1);
        if (r.role_in_group !== 'leader' && r.role_in_group !== 'co_leader') return;
        if (!r.profile) return;
        if (!leadersByGroup.has(r.group_id)) leadersByGroup.set(r.group_id, []);
        leadersByGroup.get(r.group_id).push({
            id: r.profile.id,
            first_name: r.profile.first_name,
            last_name: r.profile.last_name,
            role_in_group: r.role_in_group,
        });
    });

    return groups.map((g) => ({
        ...g,
        leaders: leadersByGroup.get(g.id) || [],
        member_count: countByGroup.get(g.id) || 0,
    }));
};

const smallGroupsController = {
    // GET /api/small-groups?status=active|archived (default: active)
    getAll: async (req, res, next) => {
        try {
            const statusFilter = req.query.status === 'archived' ? 'archived' : 'active';
            const { data: groups, error } = await supabase
                .from('small_groups')
                .select('*')
                .eq('company_id', req.companyId)
                .eq('status', statusFilter)
                .order('name');
            if (error) throw error;

            if (GLOBAL_VISIBILITY_ROLES.includes(req.profile?.role)) {
                const withLeaders = await attachLeaders(groups, req.companyId);
                return res.json({ success: true, data: withLeaders, count: withLeaders.length });
            }

            const [deptIds, myMemberships] = await Promise.all([
                resolveVisibleDepartmentIds(req),
                supabase
                    .from('small_group_members')
                    .select('group_id')
                    .eq('profile_id', req.user.id)
                    .eq('company_id', req.companyId)
                    .eq('status', 'active'),
            ]);
            const myGroupIds = new Set((myMemberships.data || []).map((m) => m.group_id));

            // Ve un grupo si cae en su alcance por departamento, O si es miembro activo puntual
            // (esto último cubre grupos sin depto o de otro depto donde igual quedó a cargo).
            let visible = groups.filter((g) =>
                (deptIds && g.department_id && deptIds.has(g.department_id)) || myGroupIds.has(g.id)
            );

            visible = await attachLeaders(visible, req.companyId);
            res.json({ success: true, data: visible, count: visible.length });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/small-groups/:id
    getById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { data: group, error } = await supabase
                .from('small_groups')
                .select('*')
                .eq('id', id)
                .eq('company_id', req.companyId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') throw notFound();
                throw error;
            }

            if (!GLOBAL_VISIBILITY_ROLES.includes(req.profile?.role)) {
                const deptIds = await resolveVisibleDepartmentIds(req);
                const deptMatch = !!(deptIds && group.department_id && deptIds.has(group.department_id));
                const canView = deptMatch || (await isActiveMember(id, req.user.id, req.companyId));
                if (!canView) throw notFound();
            }

            const [groupWithLeaders] = await attachLeaders([group], req.companyId);

            res.json({ success: true, data: groupWithLeaders });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/small-groups
    create: async (req, res, next) => {
        try {
            const role = req.profile?.role;
            const isGlobalAdmin = GLOBAL_VISIBILITY_ROLES.includes(role);
            const isDeptDirector = DEPT_VISIBILITY_ROLES.includes(role);
            const isDeptLeader = DEPT_LEADER_ROLES.includes(role) && !!req.profile?.department_id;
            if (!isGlobalAdmin && !isDeptDirector && !isDeptLeader) {
                const err = new Error('No tenés permisos para crear grupos pequeños');
                err.status = 403;
                throw err;
            }

            const {
                name, description, category, requires_approval,
                capacity, frequency, weekday, meeting_time, location,
                leader_profile_id, department_id,
            } = req.body;

            if (!name || !name.trim()) {
                const err = new Error('El campo name es requerido');
                err.name = 'ValidationError';
                throw err;
            }

            // Admin/secretaria: grupo libre o en cualquier depto. Lider: siempre su único depto.
            // Director-level: uno de sus deptos asignados (a elegir si tiene más de uno).
            let groupDepartmentId;
            if (isGlobalAdmin) {
                groupDepartmentId = department_id || null;
            } else if (isDeptLeader) {
                groupDepartmentId = req.profile.department_id;
            } else {
                const allowedDeptIds = await resolveVisibleDepartmentIds(req);
                if (!allowedDeptIds || allowedDeptIds.size === 0) {
                    const err = new Error('No tenés departamentos asignados para crear un grupo');
                    err.status = 403;
                    throw err;
                }
                if (department_id) {
                    if (!allowedDeptIds.has(department_id)) {
                        const err = new Error('Solo podés crear grupos en tus departamentos asignados');
                        err.status = 403;
                        throw err;
                    }
                    groupDepartmentId = department_id;
                } else if (allowedDeptIds.size === 1) {
                    groupDepartmentId = [...allowedDeptIds][0];
                } else {
                    const err = new Error('Especificá department_id: tenés más de un departamento asignado');
                    err.name = 'ValidationError';
                    throw err;
                }
            }

            let leaderProfileId = leader_profile_id || null;
            if (!isGlobalAdmin) {
                // Sin líder explícito, el creador queda como líder del grupo.
                leaderProfileId = leaderProfileId || req.user.id;
                if (leaderProfileId !== req.user.id) {
                    // Solo puede nombrar líder a alguien del departamento del grupo.
                    const { data: candidate } = await supabase
                        .from('profiles')
                        .select('id, department_id')
                        .eq('id', leaderProfileId)
                        .eq('company_id', req.companyId)
                        .maybeSingle();
                    if (!candidate || candidate.department_id !== groupDepartmentId) {
                        const err = new Error('Solo podés asignar como líder a alguien del departamento del grupo');
                        err.status = 403;
                        throw err;
                    }
                }
            }

            const { data: group, error } = await supabase
                .from('small_groups')
                .insert([{
                    company_id: req.companyId,
                    name: name.trim(),
                    description: description || null,
                    category: category || null,
                    requires_approval: requires_approval !== undefined ? !!requires_approval : true,
                    capacity: capacity || null,
                    frequency: frequency || null,
                    weekday: weekday ?? null,
                    meeting_time: meeting_time || null,
                    location: location || null,
                    department_id: groupDepartmentId,
                    created_by: req.user.id,
                }])
                .select()
                .single();
            if (error) throw error;

            let leaders = [];
            if (leaderProfileId) {
                const { data: leaderProfile } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name')
                    .eq('id', leaderProfileId)
                    .eq('company_id', req.companyId)
                    .maybeSingle();
                if (!leaderProfile) {
                    const err = new Error('El líder seleccionado no existe en esta empresa');
                    err.name = 'ValidationError';
                    throw err;
                }
                const { error: leaderErr } = await supabase.from('small_group_members').insert([{
                    company_id: req.companyId,
                    group_id: group.id,
                    profile_id: leaderProfileId,
                    role_in_group: 'leader',
                    status: 'active',
                    approved_at: new Date().toISOString(),
                    approved_by: req.user.id,
                }]);
                if (leaderErr) throw leaderErr; // no tragarse el error: el grupo quedaría sin líder
                leaders = [{ id: leaderProfile.id, first_name: leaderProfile.first_name, last_name: leaderProfile.last_name, role_in_group: 'leader' }];
            }

            // Devolvemos el grupo ya con su líder y contador, para que el front lo muestre sin otra consulta.
            res.status(201).json({ success: true, message: 'Grupo creado exitosamente', data: { ...group, leaders, member_count: leaders.length } });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/small-groups/:id
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!(await canManageGroup(req, id))) {
                const err = new Error('No tenés permisos para editar este grupo');
                err.status = 403;
                throw err;
            }

            const { data: current } = await supabase
                .from('small_groups')
                .select('status')
                .eq('id', id)
                .eq('company_id', req.companyId)
                .maybeSingle();
            if (!current) throw notFound();

            let updates = {};
            if (current.status === 'archived') {
                // Archivado: lo único permitido es reactivarlo. Nada más se edita hasta entonces.
                if (req.body.status !== 'active') {
                    const err = new Error('Este grupo está archivado. Reactivalo para poder editarlo.');
                    err.status = 409;
                    err.code = 'GROUP_ARCHIVED';
                    throw err;
                }
                updates = { status: 'active' };
            } else {
                // department_id no es editable: se fija al crear el grupo.
                const allowedFields = [
                    'name', 'description', 'category', 'requires_approval',
                    'capacity', 'frequency', 'weekday', 'meeting_time', 'location', 'status',
                ];
                allowedFields.forEach((f) => {
                    if (req.body[f] !== undefined) updates[f] = req.body[f];
                });
                if (updates.name) updates.name = updates.name.trim();
            }

            const { data, error } = await supabase
                .from('small_groups')
                .update(updates)
                .eq('id', id)
                .eq('company_id', req.companyId)
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') throw notFound();
                throw error;
            }

            res.json({ success: true, message: 'Grupo actualizado exitosamente', data });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/small-groups/:id — archivado (soft), preserva historial de miembros/reuniones
    archive: async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!(await canManageGroup(req, id))) {
                const err = new Error('No tenés permisos para archivar este grupo');
                err.status = 403;
                throw err;
            }

            const { data, error } = await supabase
                .from('small_groups')
                .update({ status: 'archived' })
                .eq('id', id)
                .eq('company_id', req.companyId)
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') throw notFound();
                throw error;
            }

            res.json({ success: true, message: 'Grupo archivado exitosamente', data });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/small-groups/:id/members
    getMembers: async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!(await canManageGroup(req, id))) {
                const err = new Error('No tenés permisos para ver estos integrantes');
                err.status = 403;
                throw err;
            }

            const { data, error } = await supabase
                .from('small_group_members')
                .select(`
                    id, role_in_group, status, requested_at, approved_at, created_at,
                    student:students(id, first_name, last_name, phone),
                    profile:profiles!small_group_members_profile_id_fkey(id, first_name, last_name, phone, email)
                `)
                .eq('group_id', id)
                .eq('company_id', req.companyId)
                .order('created_at');
            if (error) throw error;

            res.json({ success: true, data, count: data.length });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/small-groups/:id/members
    // Body: { profile_id } | { student_id } | { first_name, last_name?, phone?, gender? } (crea contacto liviano)
    addMember: async (req, res, next) => {
        try {
            const { id: groupId } = req.params;
            if (!(await canManageGroup(req, groupId))) {
                const err = new Error('No tenés permisos para agregar miembros a este grupo');
                err.status = 403;
                throw err;
            }

            const { data: group, error: groupErr } = await supabase
                .from('small_groups')
                .select('id, capacity, department_id, status')
                .eq('id', groupId)
                .eq('company_id', req.companyId)
                .single();
            if (groupErr) {
                if (groupErr.code === 'PGRST116') throw notFound();
                throw groupErr;
            }
            if (group.status === 'archived') {
                const err = new Error('Este grupo está archivado. Reactivalo antes de hacer cambios.');
                err.status = 409;
                err.code = 'GROUP_ARCHIVED';
                throw err;
            }

            // Solo admin/secretaria agregan gente de cualquier departamento; el resto (incluido
            // director-level, ya acotado por canManageGroup a sus deptos asignados) queda limitado
            // a personas del departamento del grupo.
            const isGlobalAdmin = GLOBAL_VISIBILITY_ROLES.includes(req.profile?.role);

            let { role_in_group, profile_id, student_id, first_name, last_name, phone, gender } = req.body;
            role_in_group = role_in_group || 'member';
            if (['leader', 'co_leader'].includes(role_in_group) && !profile_id) {
                const err = new Error('Líder y co-líder necesitan un profile_id (deben tener cuenta en la app)');
                err.name = 'ValidationError';
                throw err;
            }

            const enforceDeptScope = !!group.department_id && !isGlobalAdmin;
            if (enforceDeptScope && profile_id) {
                const { data: candidate } = await supabase
                    .from('profiles')
                    .select('id, department_id')
                    .eq('id', profile_id)
                    .eq('company_id', req.companyId)
                    .maybeSingle();
                if (!candidate || candidate.department_id !== group.department_id) {
                    const err = new Error('Solo podés agregar personas de tu propio departamento a este grupo');
                    err.status = 403;
                    throw err;
                }
            }
            if (enforceDeptScope && student_id) {
                const { data: candidate } = await supabase
                    .from('students')
                    .select('id, department_id')
                    .eq('id', student_id)
                    .eq('company_id', req.companyId)
                    .maybeSingle();
                let belongs = candidate?.department_id === group.department_id;
                if (!belongs) {
                    const { data: secondary } = await supabase
                        .from('student_departments')
                        .select('id')
                        .eq('student_id', student_id)
                        .eq('department_id', group.department_id)
                        .eq('company_id', req.companyId)
                        .maybeSingle();
                    belongs = !!secondary;
                }
                if (!belongs) {
                    const err = new Error('Solo podés agregar alumnos de tu propio departamento a este grupo');
                    err.status = 403;
                    throw err;
                }
            }

            if (!profile_id && !student_id) {
                if (!first_name || !first_name.trim()) {
                    const err = new Error('Falta profile_id, student_id, o first_name para crear un contacto nuevo');
                    err.name = 'ValidationError';
                    throw err;
                }
                // Contacto sin cuenta: crea una fila liviana en `students` (heredando el depto del
                // grupo si corresponde) para que siga contando en el límite de miembros del plan.
                await assertMemberLimitNotReached(req.companyId);
                const { data: newStudent, error: createErr } = await supabase
                    .from('students')
                    .insert([{
                        company_id: req.companyId,
                        first_name: first_name.trim(),
                        last_name: last_name ? last_name.trim() : null,
                        phone: phone || null,
                        gender: gender || 'masculino',
                        department_id: group.department_id || null,
                    }])
                    .select('id')
                    .single();
                if (createErr) throw createErr;
                student_id = newStudent.id;
            }

            if (group.capacity) {
                const { count: activeCount } = await supabase
                    .from('small_group_members')
                    .select('id', { count: 'exact', head: true })
                    .eq('group_id', groupId)
                    .eq('company_id', req.companyId)
                    .eq('status', 'active');
                if ((activeCount || 0) >= group.capacity) {
                    const err = new Error('El grupo alcanzó su capacidad máxima');
                    err.status = 409;
                    err.code = 'GROUP_CAPACITY_REACHED';
                    throw err;
                }
            }

            const { data: member, error: memberErr } = await supabase
                .from('small_group_members')
                .insert([{
                    company_id: req.companyId,
                    group_id: groupId,
                    profile_id: profile_id || null,
                    student_id: profile_id ? null : student_id,
                    role_in_group,
                    status: 'active',
                    approved_at: new Date().toISOString(),
                    approved_by: req.user.id,
                }])
                .select()
                .single();
            if (memberErr) {
                if (memberErr.code === '23505') {
                    const err = new Error('Esa persona ya es parte del grupo');
                    err.status = 409;
                    throw err;
                }
                throw memberErr;
            }

            res.status(201).json({ success: true, message: 'Miembro agregado exitosamente', data: member });
        } catch (error) {
            next(error);
        }
    },

    // PATCH /api/small-groups/:id/members/:memberId — cambiar rol/estado (aprobar, promover, etc.)
    updateMember: async (req, res, next) => {
        try {
            const { id: groupId, memberId } = req.params;
            if (!(await canManageGroup(req, groupId))) {
                const err = new Error('No tenés permisos para modificar estos integrantes');
                err.status = 403;
                throw err;
            }
            await assertGroupNotArchived(groupId, req.companyId);

            const { role_in_group, status } = req.body;

            const updates = {};
            if (role_in_group) updates.role_in_group = role_in_group;
            if (status) updates.status = status;

            const { data, error } = await supabase
                .from('small_group_members')
                .update(updates)
                .eq('id', memberId)
                .eq('group_id', groupId)
                .eq('company_id', req.companyId)
                .select()
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    const err = new Error('Miembro no encontrado en este grupo');
                    err.status = 404;
                    throw err;
                }
                throw error;
            }

            res.json({ success: true, message: 'Miembro actualizado exitosamente', data });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/small-groups/:id/members/:memberId — quita la membresía (no borra al alumno/perfil)
    removeMember: async (req, res, next) => {
        try {
            const { id: groupId, memberId } = req.params;
            if (!(await canManageGroup(req, groupId))) {
                const err = new Error('No tenés permisos para modificar estos integrantes');
                err.status = 403;
                throw err;
            }
            await assertGroupNotArchived(groupId, req.companyId);

            // No podés sacarte a vos mismo del grupo.
            const { data: target } = await supabase
                .from('small_group_members')
                .select('profile_id')
                .eq('id', memberId)
                .eq('group_id', groupId)
                .eq('company_id', req.companyId)
                .maybeSingle();
            if (target?.profile_id && target.profile_id === req.user.id) {
                const err = new Error('No podés sacarte a vos mismo del grupo');
                err.status = 400;
                throw err;
            }

            const { error } = await supabase
                .from('small_group_members')
                .delete()
                .eq('id', memberId)
                .eq('group_id', groupId)
                .eq('company_id', req.companyId);
            if (error) throw error;

            res.json({ success: true, message: 'Miembro quitado del grupo' });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/small-groups/:id/meetings
    getMeetings: async (req, res, next) => {
        try {
            const { id: groupId } = req.params;
            if (!(await canManageGroup(req, groupId))) {
                const err = new Error('No tenés permisos para ver las reuniones de este grupo');
                err.status = 403;
                throw err;
            }

            const { data, error } = await supabase
                .from('small_group_meetings')
                .select('*')
                .eq('group_id', groupId)
                .eq('company_id', req.companyId)
                .order('meeting_date', { ascending: false });
            if (error) throw error;

            res.json({ success: true, data, count: data.length });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/small-groups/:id/meetings - body: { meeting_date, notes? }
    createMeeting: async (req, res, next) => {
        try {
            const { id: groupId } = req.params;
            if (!(await canManageGroup(req, groupId))) {
                const err = new Error('No tenés permisos para registrar reuniones en este grupo');
                err.status = 403;
                throw err;
            }

            const { meeting_date, notes } = req.body;
            if (!meeting_date || !/^\d{4}-\d{2}-\d{2}$/.test(meeting_date)) {
                const err = new Error('meeting_date es requerido con formato YYYY-MM-DD');
                err.name = 'ValidationError';
                throw err;
            }

            const { data, error } = await supabase
                .from('small_group_meetings')
                .upsert([{
                    company_id: req.companyId,
                    group_id: groupId,
                    meeting_date,
                    notes: notes || null,
                    created_by: req.user.id,
                }], { onConflict: 'group_id,meeting_date' })
                .select()
                .single();
            if (error) throw error;

            res.status(201).json({ success: true, message: 'Reunión registrada exitosamente', data });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/small-groups/:id/meetings/:meetingId/attendance
    // Devuelve el roster activo del grupo con su estado de asistencia para esa reunión.
    getAttendance: async (req, res, next) => {
        try {
            const { id: groupId, meetingId } = req.params;
            if (!(await canManageGroup(req, groupId))) {
                const err = new Error('No tenés permisos para ver la asistencia de este grupo');
                err.status = 403;
                throw err;
            }

            const [{ data: members, error: membersErr }, { data: attendance, error: attErr }] = await Promise.all([
                supabase
                    .from('small_group_members')
                    .select(`
                        id, role_in_group,
                        student:students(id, first_name, last_name),
                        profile:profiles!small_group_members_profile_id_fkey(id, first_name, last_name)
                    `)
                    .eq('group_id', groupId)
                    .eq('company_id', req.companyId)
                    .eq('status', 'active'),
                supabase
                    .from('small_group_attendance')
                    .select('member_id, present')
                    .eq('meeting_id', meetingId)
                    .eq('company_id', req.companyId),
            ]);
            if (membersErr) throw membersErr;
            if (attErr) throw attErr;

            const presentByMember = new Map((attendance || []).map((a) => [a.member_id, a.present]));
            const roster = (members || []).map((m) => ({
                ...m,
                present: presentByMember.has(m.id) ? presentByMember.get(m.id) : null,
            }));

            res.json({ success: true, data: roster, count: roster.length });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/small-groups/:id/meetings/:meetingId/attendance
    // body: { records: [{ member_id, present }] }
    saveAttendance: async (req, res, next) => {
        try {
            const { id: groupId, meetingId } = req.params;
            if (!(await canManageGroup(req, groupId))) {
                const err = new Error('No tenés permisos para tomar asistencia en este grupo');
                err.status = 403;
                throw err;
            }
            await assertGroupNotArchived(groupId, req.companyId);

            const { records } = req.body;
            if (!Array.isArray(records) || records.length === 0) {
                const err = new Error('records debe ser un array con al menos un elemento');
                err.name = 'ValidationError';
                throw err;
            }

            const { data: meeting, error: meetingErr } = await supabase
                .from('small_group_meetings')
                .select('id')
                .eq('id', meetingId)
                .eq('group_id', groupId)
                .eq('company_id', req.companyId)
                .maybeSingle();
            if (meetingErr) throw meetingErr;
            if (!meeting) {
                const err = new Error('Reunión no encontrada en este grupo');
                err.status = 404;
                throw err;
            }

            const rows = records.map((r) => ({
                company_id: req.companyId,
                meeting_id: meetingId,
                member_id: r.member_id,
                present: !!r.present,
            }));

            const { data, error } = await supabase
                .from('small_group_attendance')
                .upsert(rows, { onConflict: 'meeting_id,member_id' })
                .select();
            if (error) throw error;

            res.json({ success: true, message: 'Asistencia guardada exitosamente', data, count: data.length });
        } catch (error) {
            next(error);
        }
    },
};

module.exports = smallGroupsController;
