const { supabaseAdmin } = require('../config/supabase');

// Roles que ven TODOS los departamentos de la empresa (mismo criterio que attendanceController).
const GLOBAL_ROLES = ['admin', 'secretaria'];

const norm = (v) => (v || '').toString().toLowerCase().trim();

module.exports = {
    // GET /api/stats/resumen - Resumen de la pantalla Estadísticas, agregado por el SP.
    resumen: async (req, res, next) => {
        try {
            const { department_id, assigned_class } = req.query;

            if (department_id && !/^[0-9a-f-]{36}$/i.test(department_id)) {
                return res.status(400).json({ success: false, message: 'department_id inválido' });
            }

            // Scope: el rol y los departamentos salen de req.profile (server-side), nunca del query.
            let deptIds = null;
            if (!GLOBAL_ROLES.includes(req.profile?.role)) {
                const { data: deps, error: depErr } = await supabaseAdmin
                    .from('departments')
                    .select('id, name')
                    .eq('company_id', req.companyId);
                if (depErr) throw depErr;

                const own = (req.profile?.departments || []).map(norm);
                const allowed = (deps || [])
                    .filter((d) => own.includes(norm(d.name)) || d.id === req.profile?.department_id)
                    .map((d) => d.id);

                if (department_id && !allowed.includes(department_id)) {
                    return res.status(403).json({ success: false, message: 'No tenés acceso a ese departamento' });
                }
                // Sin depto explícito: limitar a los propios. Si no tiene ninguno el array queda
                // vacío y el SP devuelve el resumen en cero, sin necesidad de un caso aparte.
                if (!department_id) deptIds = allowed;
            }

            const { data, error } = await supabaseAdmin.schema('api').rpc('estadisticas_resumen', {
                p_company_id: req.companyId,
                p_department_id: department_id || null,
                p_department_ids: deptIds,
                p_assigned_class: (assigned_class && assigned_class !== 'all') ? assigned_class : null,
            });

            if (error) throw error;

            res.json({ success: true, data: data || null });
        } catch (error) {
            next(error);
        }
    },
};
