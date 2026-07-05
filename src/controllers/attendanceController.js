const { supabase } = require('../config/supabase');

// Roles que pueden consultar la cobertura de asistencia
const COVERAGE_ROLES = ['admin', 'secretaria', 'director', 'vicedirector', 'director_general'];
// Roles que ven TODOS los departamentos de la empresa. director/vicedirector/director_general
// se limitan a los departamentos asignados en su perfil (configurable en Gestión de Usuarios).
const ALL_DEPT_ROLES = ['admin', 'secretaria'];

const norm = (v) => (v || '').toString().toLowerCase().trim();

// Hoy en zona horaria de Argentina (YYYY-MM-DD)
const todayInAR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

// Última fecha <= hoy cuyo día de semana esté entre los días de actividad de los deptos.
const resolveDefaultDate = (departments, todayStr) => {
    const days = new Set();
    departments.forEach((d) => (d.activity_days || []).forEach((n) => days.add(Number(n))));
    if (days.size === 0) return todayStr; // sin config: hoy
    const [y, m, dd] = todayStr.split('-').map(Number);
    const base = new Date(Date.UTC(y, m - 1, dd));
    for (let i = 0; i < 7; i++) {
        const dt = new Date(base);
        dt.setUTCDate(base.getUTCDate() - i);
        if (days.has(dt.getUTCDay())) return dt.toISOString().slice(0, 10);
    }
    return todayStr;
};

const attendanceController = {
    // GET /api/attendance/coverage?date=YYYY-MM-DD[&department_id=]
    // Devuelve, por departamento, qué clases ya tomaron asistencia ese día y cuáles no.
    coverage: async (req, res, next) => {
        try {
            const { date, department_id } = req.query;
            const role = req.profile?.role;

            if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ success: false, message: 'date debe tener formato YYYY-MM-DD' });
            }
            if (!COVERAGE_ROLES.includes(role)) {
                return res.status(403).json({ success: false, message: 'No tenés acceso a la cobertura de asistencia' });
            }

            // 1. Departamentos permitidos segun rol
            let deptQuery = supabase
                .from('departments')
                .select('id, name, classes, activity_days')
                .eq('company_id', req.companyId);

            if (!ALL_DEPT_ROLES.includes(role)) {
                const names = req.profile?.departments || [];
                if (names.length === 0) return res.json({ success: true, date, departments: [] });
                deptQuery = deptQuery.in('name', names);
            }
            if (department_id) deptQuery = deptQuery.eq('id', department_id);

            const { data: departments, error: deptErr } = await deptQuery;
            if (deptErr) throw deptErr;
            if (!departments || departments.length === 0) {
                return res.json({ success: true, date: date || todayInAR(), departments: [] });
            }

            // Fecha objetivo: la pedida, o la última con actividad segun los días del depto.
            const targetDate = date || resolveDefaultDate(departments, todayInAR());
            const deptIds = departments.map((d) => d.id);

            // 2. Alumnos activos por departamento/clase. Un alumno puede pertenecer a una clase por su
            //    departamento PRIMARIO (students) o por uno SECUNDARIO (student_departments). Contamos
            //    ids únicos para que el total coincida con la clase real (igual que la asistencia).
            const [{ data: students, error: stuErr }, { data: deptAssign, error: daErr }] = await Promise.all([
                supabase
                    .from('students')
                    .select('id, department_id, assigned_class')
                    .in('department_id', deptIds)
                    .is('deleted_at', null)
                    .eq('company_id', req.companyId),
                supabase
                    .from('student_departments')
                    .select('student_id, department_id, assigned_class, students!inner(deleted_at)')
                    .in('department_id', deptIds)
                    .is('students.deleted_at', null)
                    .eq('company_id', req.companyId),
            ]);
            if (stuErr) throw stuErr;
            if (daErr) throw daErr;

            // mapa dept -> clase(normalizada) -> Set(studentId)  (sin duplicar primario + secundario)
            const studentSets = {};
            const addRoster = (deptId, cls, studentId) => {
                const c = norm(cls);
                if (!deptId || !c || !studentId) return;
                studentSets[deptId] ??= {};
                studentSets[deptId][c] ??= new Set();
                studentSets[deptId][c].add(studentId);
            };
            (students || []).forEach((s) => addRoster(s.department_id, s.assigned_class, s.id));
            (deptAssign || []).forEach((a) => addRoster(a.department_id, a.assigned_class, a.student_id));

            // dept -> clase -> cantidad
            const studentCount = {};
            for (const deptId in studentSets) {
                studentCount[deptId] = {};
                for (const c in studentSets[deptId]) studentCount[deptId][c] = studentSets[deptId][c].size;
            }

            // 3. Asistencia tomada ese dia
            const { data: att, error: attErr } = await supabase
                .from('attendance')
                .select('department_id, assigned_class, status')
                .eq('date', targetDate)
                .in('department_id', deptIds)
                .eq('company_id', req.companyId);
            if (attErr) throw attErr;

            // mapa dept -> clase(normalizada) -> { presentes, total }
            const taken = {};
            (att || []).forEach((a) => {
                const c = norm(a.assigned_class);
                taken[a.department_id] ??= {};
                taken[a.department_id][c] ??= { presentes: 0, total: 0 };
                taken[a.department_id][c].total += 1;
                if (a.status === true) taken[a.department_id][c].presentes += 1;
            });

            // 4. Armar respuesta por departamento
            const result = departments.map((d) => {
                const counts = studentCount[d.id] || {};
                const takenMap = taken[d.id] || {};
                // clases esperadas: las de departments.classes que tienen al menos un alumno
                const classes = (d.classes || [])
                    .filter((label) => counts[norm(label)] > 0)
                    .map((label) => {
                        const key = norm(label);
                        const t = takenMap[key];
                        return {
                            clase: label,
                            tomada: !!t,
                            presentes: t?.presentes || 0,
                            total: counts[key] || 0,
                        };
                    });
                return {
                    department_id: d.id,
                    name: d.name,
                    total_clases: classes.length,
                    tomadas: classes.filter((c) => c.tomada).length,
                    classes,
                };
            });

            res.json({ success: true, date: targetDate, departments: result });
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
