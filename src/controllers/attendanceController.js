const { supabase, supabaseAdmin } = require('../config/supabase');

// Roles que pueden consultar la cobertura de asistencia
const COVERAGE_ROLES = ['admin', 'secretaria', 'director', 'vicedirector', 'director_general'];
// Roles que ven TODOS los departamentos de la empresa. director/vicedirector/director_general
// se limitan a los departamentos asignados en su perfil (configurable en Gestión de Usuarios).
const ALL_DEPT_ROLES = ['admin', 'secretaria'];

// Hoy en zona horaria de Argentina (YYYY-MM-DD)
const todayInAR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

const attendanceController = {
    // GET /api/attendance/coverage?date=YYYY-MM-DD[&department_id=]
    // Devuelve, por departamento, qué clases ya tomaron asistencia ese día y cuáles no.
    // Todo lo resuelve el SP api.asistencia_cobertura: antes el controller se traía el padrón
    // completo de la empresa (students + student_departments, sin paginar) para contar en JS.
    coverage: async (req, res, next) => {
        try {
            const { date, department_id } = req.query;
            const role = req.profile?.role;

            if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ success: false, message: 'date debe tener formato YYYY-MM-DD' });
            }
            if (department_id && !/^[0-9a-f-]{36}$/i.test(department_id)) {
                return res.status(400).json({ success: false, message: 'department_id inválido' });
            }
            if (!COVERAGE_ROLES.includes(role)) {
                return res.status(403).json({ success: false, message: 'No tenés acceso a la cobertura de asistencia' });
            }

            // Scope: admin/secretaria ven toda la empresa; el resto solo sus departamentos.
            let deptNames = null;
            if (!ALL_DEPT_ROLES.includes(role)) {
                const names = req.profile?.departments || [];
                if (names.length === 0) {
                    return res.json({ success: true, date: date || todayInAR(), departments: [] });
                }
                deptNames = names;
            }

            const { data, error } = await supabaseAdmin.schema('api').rpc('asistencia_cobertura', {
                p_company_id: req.companyId,
                p_fecha: date || null,
                p_department_id: department_id || null,
                p_department_names: deptNames,
            });
            if (error) throw error;

            res.json({
                success: true,
                date: data?.date || date || todayInAR(),
                departments: data?.departments || [],
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/attendance/matrix?start=&end=[&department_id=][&department=][&assigned_class=]
    // Matriz de asistencia ya agregada por el SP (una fila por alumno con un caracter por fecha).
    matrix: async (req, res, next) => {
        try {
            const { start, end, department_id, department, assigned_class } = req.query;
            const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');

            if (!isDate(start) || !isDate(end)) {
                return res.status(400).json({ success: false, message: 'start y end deben tener formato YYYY-MM-DD' });
            }
            if (start > end) {
                return res.status(400).json({ success: false, message: 'start no puede ser posterior a end' });
            }
            if (department_id && !/^[0-9a-f-]{36}$/i.test(department_id)) {
                return res.status(400).json({ success: false, message: 'department_id inválido' });
            }

            // Scope: admin/secretaria ven toda la empresa; el resto solo sus departamentos.
            let deptNames = department ? [department] : null;
            if (!ALL_DEPT_ROLES.includes(req.profile?.role)) {
                const own = req.profile?.departments || [];
                if (own.length === 0) return res.json({ success: true, dates: [], rows: [] });
                if (department && !own.includes(department)) {
                    return res.status(403).json({ success: false, message: 'No tenés acceso a ese departamento' });
                }
                // Sin filtro explícito: limitar a los departamentos del perfil, no a toda la empresa.
                if (!deptNames) deptNames = own;
                // El department_id tambien tiene que ser de un depto propio.
                if (department_id) {
                    const { data: dept } = await supabaseAdmin
                        .from('departments')
                        .select('name')
                        .eq('id', department_id)
                        .eq('company_id', req.companyId)
                        .maybeSingle();
                    if (!dept || !own.includes(dept.name)) {
                        return res.status(403).json({ success: false, message: 'No tenés acceso a ese departamento' });
                    }
                }
            }

            const { data, error } = await supabaseAdmin.schema('api').rpc('asistencia_matriz', {
                p_company_id: req.companyId,
                p_start: start,
                p_end: end,
                p_department_id: department_id || null,
                p_department_names: deptNames,
                p_assigned_class: (assigned_class && assigned_class !== 'all') ? assigned_class : null,
            });

            if (error) throw error;

            res.json({ success: true, dates: data?.dates || [], rows: data?.rows || [] });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/attendance/by-date - Eliminar toda la asistencia de una fecha
    deleteByDate: async (req, res, next) => {
        try {
            const { date, department_id, assigned_class } = req.body;

            if (!date) {
                return res.status(400).json({ success: false, message: 'date es requerido' });
            }

            let query = supabase
                .from('attendance')
                .delete()
                .eq('date', date)
                .eq('company_id', req.companyId);

            if (department_id) {
                query = query.eq('department_id', department_id);
            }
            if (assigned_class) {
                query = query.eq('assigned_class', assigned_class);
            }

            const { data, error } = await query.select('id');

            if (error) throw error;
            res.json({ success: true, deleted: data?.length || 0 });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = attendanceController;
