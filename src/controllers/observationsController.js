const { supabase } = require('../config/supabase');

const GLOBAL_ROLES = ['admin', 'director_general', 'secretaria'];

async function getRequesterScope(req) {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, role, roles, department_id, departments, assignments')
        .eq('id', req.user.id)
        .single();
    if (error) throw error;

    const roles = Array.isArray(profile.roles) && profile.roles.length > 0
        ? profile.roles
        : (profile.role ? [profile.role] : []);
    const isGlobal = roles.some(r => GLOBAL_ROLES.includes(r));

    // Recolectar department_ids accesibles desde profile.department_id + assignments
    const deptIds = new Set();
    if (profile.department_id) deptIds.add(profile.department_id);
    if (Array.isArray(profile.assignments)) {
        for (const a of profile.assignments) {
            if (a?.department_id) deptIds.add(a.department_id);
        }
    }
    // Si solo tenemos nombres en `departments`, resolverlos a IDs
    if (deptIds.size === 0 && Array.isArray(profile.departments) && profile.departments.length > 0) {
        const { data: deps } = await supabase
            .from('departments')
            .select('id')
            .eq('company_id', req.companyId)
            .in('name', profile.departments);
        deps?.forEach(d => deptIds.add(d.id));
    }

    return { isGlobal, accessibleDeptIds: Array.from(deptIds), activeDeptId: profile.department_id || null };
}

const observationsController = {
    // GET /api/observations/:studentId
    getByStudentId: async (req, res, next) => {
        try {
            const { studentId } = req.params;
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('profile_id')
                .eq('id', studentId)
                .eq('company_id', req.companyId)
                .single();

            if (studentError) throw studentError;

            const scope = await getRequesterScope(req);

            let query = supabase
                .from('student_observations')
                .select(`
                  *,
                  profiles (
                    first_name,
                    last_name
                  )
                `)
                .eq('company_id', req.companyId);

            if (student.profile_id) {
                query = query.eq('profile_id', student.profile_id);
            } else {
                query = query.eq('student_id', studentId);
            }

            // Scoping por departamento: roles globales ven todo;
            // el resto ve solo observaciones de departamentos accesibles
            // (más las legacy sin department_id).
            if (!scope.isGlobal) {
                if (scope.accessibleDeptIds.length > 0) {
                    const idList = scope.accessibleDeptIds.map(id => `"${id}"`).join(',');
                    query = query.or(`department_id.is.null,department_id.in.(${idList})`);
                } else {
                    query = query.is('department_id', null);
                }
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ success: true, data: data || [] });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/observations
    create: async (req, res, next) => {
        try {
            const { student_id, observation, created_by, department_id } = req.body;

            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('profile_id')
                .eq('id', student_id)
                .eq('company_id', req.companyId)
                .single();

            if (studentError) throw studentError;

            // Si el cliente no envía department_id, derivarlo del depto activo del autor
            let resolvedDeptId = department_id || null;
            if (!resolvedDeptId) {
                const scope = await getRequesterScope(req);
                resolvedDeptId = scope.activeDeptId;
            }

            const { data, error } = await supabase
                .from('student_observations')
                .insert([{
                    student_id,
                    observation,
                    created_by,
                    profile_id: student.profile_id,
                    department_id: resolvedDeptId,
                    company_id: req.companyId
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    // PUT /api/observations/:id
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { observation } = req.body;
            const { data, error } = await supabase
                .from('student_observations')
                .update({ observation })
                .eq('id', id)
                .eq('company_id', req.companyId)
                .select()
                .single();

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/observations/:id
    delete: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from('student_observations')
                .delete()
                .eq('id', id)
                .eq('company_id', req.companyId);

            if (error) throw error;
            res.json({ success: true, message: 'Observation deleted' });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = observationsController;
