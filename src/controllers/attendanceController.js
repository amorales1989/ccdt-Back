const { supabase, supabaseAdmin } = require('../config/supabase');

// Roles que pueden consultar la cobertura de asistencia
const COVERAGE_ROLES = ['admin', 'secretaria', 'director', 'vicedirector', 'director_general'];
// Roles que ven TODOS los departamentos de la empresa. director/vicedirector/director_general
// se limitan a los departamentos asignados en su perfil (configurable en Gestión de Usuarios).
const ALL_DEPT_ROLES = ['admin', 'secretaria'];

// Roles que pueden marcar un día como evento especial en cualquier clase de su departamento.
const DIRECTOR_ROLES = ['director', 'vicedirector', 'director_general'];
// Paleta de los eventos especiales. Debe coincidir con src/lib/eventColors.ts del front.
const EVENT_COLORS = ['amber', 'sky', 'violet', 'rose', 'teal', 'lime'];

// Hoy en zona horaria de Argentina (YYYY-MM-DD)
const todayInAR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
const isUuid = (v) => /^[0-9a-f-]{36}$/i.test(v || '');

// Color automático: el menos usado en el departamento dentro del año de la fecha, para que
// dos eventos cercanos no salgan del mismo color en la leyenda del reporte.
const pickEventColor = async (companyId, departmentId, date) => {
    const year = date.slice(0, 4);
    const { data } = await supabaseAdmin
        .from('class_events')
        .select('color')
        .eq('company_id', companyId)
        .eq('department_id', departmentId)
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`);

    const usos = new Map(EVENT_COLORS.map((c) => [c, 0]));
    (data || []).forEach((e) => {
        if (usos.has(e.color)) usos.set(e.color, usos.get(e.color) + 1);
    });
    const min = Math.min(...EVENT_COLORS.map((c) => usos.get(c)));
    const candidatos = EVENT_COLORS.filter((c) => usos.get(c) === min);
    return candidatos[Math.floor(Math.random() * candidatos.length)];
};

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

            res.json({
                success: true,
                dates: data?.dates || [],
                rows: data?.rows || [],
                events: data?.events || [],
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/attendance/events?start=&end=[&department_id=][&department=][&assigned_class=]
    // Días especiales (sin clase) del rango, para pintarlos en la grilla y avisarlos en pantalla.
    events: async (req, res, next) => {
        try {
            const { start, end, department_id, department, assigned_class } = req.query;

            if (!isDate(start) || !isDate(end)) {
                return res.status(400).json({ success: false, message: 'start y end deben tener formato YYYY-MM-DD' });
            }
            if (start > end) {
                return res.status(400).json({ success: false, message: 'start no puede ser posterior a end' });
            }
            if (department_id && !isUuid(department_id)) {
                return res.status(400).json({ success: false, message: 'department_id inválido' });
            }

            // Mismo scope por rol que la matriz: admin/secretaria ven toda la empresa.
            let deptNames = department ? [department] : null;
            if (!ALL_DEPT_ROLES.includes(req.profile?.role)) {
                const own = req.profile?.departments || [];
                if (own.length === 0) return res.json({ success: true, data: [] });
                if (department && !own.includes(department)) {
                    return res.status(403).json({ success: false, message: 'No tenés acceso a ese departamento' });
                }
                if (!deptNames) deptNames = own;
            }

            const { data, error } = await supabaseAdmin.schema('api').rpc('asistencia_eventos_listar', {
                p_company_id: req.companyId,
                p_start: start,
                p_end: end,
                p_department_id: department_id || null,
                p_department_names: deptNames,
                p_assigned_class: (assigned_class && assigned_class !== 'all') ? assigned_class : null,
            });
            if (error) throw error;

            res.json({ success: true, data: data || [] });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/attendance/events - Marcar un día como evento especial (no se tomó lista)
    createEvent: async (req, res, next) => {
        try {
            const { date, department_id, assigned_class, title, description } = req.body;
            const role = req.profile?.role;

            if (!isDate(date)) {
                return res.status(400).json({ success: false, message: 'date debe tener formato YYYY-MM-DD' });
            }
            if (!isUuid(department_id)) {
                return res.status(400).json({ success: false, message: 'department_id inválido' });
            }
            const tituloLimpio = (title || '').trim().slice(0, 80);
            if (!tituloLimpio) {
                return res.status(400).json({ success: false, message: 'El título es requerido' });
            }

            // El departamento tiene que existir y ser de la empresa del usuario.
            const { data: dept } = await supabaseAdmin
                .from('departments')
                .select('id, name')
                .eq('id', department_id)
                .eq('company_id', req.companyId)
                .maybeSingle();
            if (!dept) {
                return res.status(404).json({ success: false, message: 'Departamento no encontrado' });
            }
            if (!ALL_DEPT_ROLES.includes(role) && !(req.profile?.departments || []).includes(dept.name)) {
                return res.status(403).json({ success: false, message: 'No tenés acceso a ese departamento' });
            }

            // Maestro/líder: solo puede marcar su propia clase, venga lo que venga en el body.
            // Admin/secretaria/director pueden marcar una clase puntual o todo el depto (null).
            const puedeElegirClase = ALL_DEPT_ROLES.includes(role) || DIRECTOR_ROLES.includes(role);
            const claseFinal = puedeElegirClase
                ? ((assigned_class || '').trim() || null)
                : (req.profile?.assigned_class || null);

            const color = await pickEventColor(req.companyId, department_id, date);

            const { data, error } = await supabaseAdmin
                .from('class_events')
                .insert([{
                    company_id: req.companyId,
                    department_id,
                    assigned_class: claseFinal,
                    date,
                    title: tituloLimpio,
                    description: (description || '').trim() || null,
                    color,
                    created_by: req.user?.id || null,
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({ success: false, message: 'Ya hay un evento registrado para esa fecha y clase' });
                }
                throw error;
            }

            res.status(201).json({ success: true, data: { ...data, department: dept.name } });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /api/attendance/events/:id
    deleteEvent: async (req, res, next) => {
        try {
            const { id } = req.params;
            const role = req.profile?.role;

            if (!isUuid(id)) {
                return res.status(400).json({ success: false, message: 'id inválido' });
            }

            const { data: evento } = await supabaseAdmin
                .from('class_events')
                .select('id, created_by, department_id, departments:department_id(name)')
                .eq('id', id)
                .eq('company_id', req.companyId)
                .maybeSingle();
            if (!evento) {
                return res.status(404).json({ success: false, message: 'Evento no encontrado' });
            }

            // Lo borra: admin/secretaria, quien lo creó, o un director de ese departamento.
            const esPropio = evento.created_by && evento.created_by === req.user?.id;
            const esDirectorDelDepto = DIRECTOR_ROLES.includes(role)
                && (req.profile?.departments || []).includes(evento.departments?.name);
            if (!ALL_DEPT_ROLES.includes(role) && !esPropio && !esDirectorDelDepto) {
                return res.status(403).json({ success: false, message: 'No podés eliminar este evento' });
            }

            const { error } = await supabaseAdmin
                .from('class_events')
                .delete()
                .eq('id', id)
                .eq('company_id', req.companyId);
            if (error) throw error;

            res.json({ success: true, message: 'Evento eliminado' });
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
