const { supabase, supabaseAdmin } = require('../config/supabase');
const NotificationService = require('./notificationService');
const WhatsAppService = require('./whatsappService');

const ABSENCE_WEEKS = 4;
// Tope de historial para reconstruir el inicio real de una racha de ausencias.
// Si el alumno lleva más de esto sin venir, el "inicio" queda fijo en el borde del lookback
// (igual sirve para deduplicar: no vuelve a cambiar mientras siga ausente).
const LOOKBACK_WEEKS = 26;

// Ayer en zona horaria de Argentina (YYYY-MM-DD)
const yesterdayInAR = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
};

// PostgREST corta en 1000 filas por request: sin paginar, un depto grande pierde las fechas
// más recientes y todos sus alumnos parecen ausentes.
const PAGE_SIZE = 1000;
const fetchAttendance = async (departmentId, companyId, dates) => {
    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('attendance')
            .select('student_id, date, status')
            .eq('department_id', departmentId)
            .eq('company_id', companyId)
            .in('date', dates)
            .order('date', { ascending: false })
            .order('student_id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) return rows;
    }
};

const weekdayOf = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

// Últimas N fechas <= referenceDate cuyo día de semana esté en activityDays (desc, más reciente primero)
const lastScheduledDates = (activityDays, referenceDate, count) => {
    const days = new Set((activityDays || []).map(Number));
    if (days.size === 0) return [];
    const [y, m, d] = referenceDate.split('-').map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    const dates = [];
    for (let i = 0; dates.length < count && i < count * 8; i++) {
        const dt = new Date(base);
        dt.setUTCDate(base.getUTCDate() - i);
        if (days.has(dt.getUTCDay())) dates.push(dt.toISOString().slice(0, 10));
    }
    return dates;
};

class AbsenceService {
    // Detecta alumnos sin presencias en las últimas ABSENCE_WEEKS fechas de clase de su depto
    // y notifica (push + WhatsApp) a los líderes/maestros de esa clase. Solo evalúa departamentos
    // que tuvieron clase ayer, y solo notifica una vez por racha de ausencias (no repite cada
    // semana mientras el alumno siga sin venir; vuelve a avisar si regresa y luego falta de nuevo).
    async checkAbsentStudents(companyId) {
        const yesterday = yesterdayInAR();
        const yesterdayDow = weekdayOf(yesterday);

        const { data: departments, error: deptErr } = await supabase
            .from('departments')
            .select('id, name, activity_days')
            .eq('company_id', companyId);
        if (deptErr) throw deptErr;

        const dueDepartments = (departments || []).filter((d) =>
            (d.activity_days || []).map(Number).includes(yesterdayDow)
        );
        if (dueDepartments.length === 0) {
            return { success: true, message: 'Ningún departamento tuvo clase ayer', notificationsSent: 0 };
        }

        const { data: companyData } = await supabase
            .from('companies')
            .select('notification_settings')
            .eq('id', companyId)
            .single();
        const absenceRoles = companyData?.notification_settings?.ausencias || ['lider', 'maestro'];

        const notificationsSent = [];
        const waQueue = [];

        for (const dept of dueDepartments) {
            const dates = lastScheduledDates(dept.activity_days, yesterday, LOOKBACK_WEEKS);
            if (dates.length < ABSENCE_WEEKS) continue; // depto sin historial suficiente aún
            const last4 = dates.slice(0, ABSENCE_WEEKS);

            const [{ data: primary }, { data: secondary }] = await Promise.all([
                supabase
                    .from('students')
                    .select('id, first_name, last_name, assigned_class')
                    .eq('department_id', dept.id)
                    .eq('company_id', companyId)
                    .is('deleted_at', null),
                supabase
                    .from('student_departments')
                    .select('student_id, assigned_class, students!inner(id, first_name, last_name, deleted_at)')
                    .eq('department_id', dept.id)
                    .eq('company_id', companyId)
                    .is('students.deleted_at', null),
            ]);

            const roster = new Map();
            (primary || []).forEach((s) => roster.set(s.id, s));
            (secondary || []).forEach((a) => {
                if (roster.has(a.student_id)) return;
                roster.set(a.student_id, {
                    id: a.student_id,
                    first_name: a.students.first_name,
                    last_name: a.students.last_name,
                    assigned_class: a.assigned_class,
                });
            });
            if (roster.size === 0) continue;

            let att;
            try {
                att = await fetchAttendance(dept.id, companyId, dates);
            } catch (attErr) {
                console.error(`❌ [AbsenceService] Error trayendo asistencia de dept ${dept.id}:`, attErr.message);
                continue;
            }

            // student_id -> Set(fechas presente) dentro del lookback
            const presentDatesByStudent = new Map();
            (att || []).forEach((a) => {
                if (a.status !== true) return;
                if (!presentDatesByStudent.has(a.student_id)) presentDatesByStudent.set(a.student_id, new Set());
                presentDatesByStudent.get(a.student_id).add(a.date);
            });

            const absentStudents = [...roster.values()].filter((s) => {
                const present = presentDatesByStudent.get(s.id);
                return !last4.some((d) => present?.has(d));
            });
            if (absentStudents.length === 0) continue;

            const { data: existingNotifs } = await supabaseAdmin
                .from('student_absence_notifications')
                .select('student_id, streak_start_date')
                .eq('department_id', dept.id)
                .eq('company_id', companyId);
            const alreadyNotified = new Map((existingNotifs || []).map((r) => [r.student_id, r.streak_start_date]));

            // Reconstruir el inicio real de la racha (fecha más antigua sin cortes hasta hoy).
            // Si la racha excede LOOKBACK_WEEKS (nunca encontramos una presencia), el borde de
            // la ventana se desliza una semana en cada corrida: si lo tomáramos tal cual, un
            // alumno ausente hace mucho se "renotificaría" cada semana para siempre. En ese caso
            // reusamos la fecha ya guardada para que quede fija mientras siga sin venir.
            const streakStartByStudent = new Map();
            absentStudents.forEach((s) => {
                const present = presentDatesByStudent.get(s.id);
                let streakLen = 0;
                for (const d of dates) {
                    if (present?.has(d)) break;
                    streakLen++;
                }
                const capped = streakLen === dates.length;
                const priorStart = alreadyNotified.get(s.id);
                streakStartByStudent.set(s.id, capped && priorStart ? priorStart : dates[streakLen - 1]);
            });

            // Solo los que arrancaron una racha nueva (o nunca fueron notificados)
            const newlyAbsentStudents = absentStudents.filter(
                (s) => alreadyNotified.get(s.id) !== streakStartByStudent.get(s.id)
            );
            if (newlyAbsentStudents.length === 0) continue;

            const { data: leaders } = await supabase
                .from('profiles')
                .select('id, first_name, phone, role, assigned_class')
                .in('role', absenceRoles)
                .eq('department_id', dept.id)
                .eq('company_id', companyId);
            if (!leaders || leaders.length === 0) continue;

            const notifiedStudentIds = new Set();

            for (const leader of leaders) {
                const relevant = newlyAbsentStudents.filter((s) =>
                    !leader.assigned_class ||
                    leader.assigned_class.toLowerCase() === (s.assigned_class || '').toLowerCase()
                );
                if (relevant.length === 0) continue;
                relevant.forEach((s) => notifiedStudentIds.add(s.id));

                const names = relevant.map((s) => `${s.first_name} ${s.last_name}`).join(', ');
                const title = `⚠️ Ausencias en ${dept.name}`;
                const body = relevant.length === 1
                    ? `${names} lleva ${ABSENCE_WEEKS} semanas consecutivas sin asistir`
                    : `${names} llevan ${ABSENCE_WEEKS} semanas consecutivas sin asistir`;

                try {
                    const result = await NotificationService.enviarAUsuario(leader.id, { titulo: title, cuerpo: body }, {
                        tipo: 'ausencias',
                        departmentId: dept.id,
                        studentIds: JSON.stringify(relevant.map((s) => s.id)),
                    });
                    notificationsSent.push({ leaderId: leader.id, dept: dept.name, success: result.success, type: 'fcm' });
                } catch (notifyError) {
                    console.error(`❌ [AbsenceService] Error notificando (push) a ${leader.id}:`, notifyError.message);
                }

                if (leader.phone) {
                    waQueue.push({
                        phone: leader.phone,
                        message: `⚠️ *Ausencias en ${dept.name}*\n\n${body}\n\n_Enviado automáticamente por CCDT Bot_`,
                        name: leader.first_name,
                        leaderId: leader.id,
                        dept: dept.name,
                    });
                }
            }

            if (notifiedStudentIds.size > 0) {
                const upsertRows = [...notifiedStudentIds].map((studentId) => ({
                    company_id: companyId,
                    student_id: studentId,
                    department_id: dept.id,
                    streak_start_date: streakStartByStudent.get(studentId),
                    notified_at: new Date().toISOString(),
                }));
                const { error: upsertErr } = await supabaseAdmin
                    .from('student_absence_notifications')
                    .upsert(upsertRows, { onConflict: 'student_id,department_id' });
                if (upsertErr) {
                    console.error(`❌ [AbsenceService] Error guardando notificaciones de dept ${dept.id}:`, upsertErr.message);
                }
            }
        }

        if (waQueue.length > 0) {
            const waResults = await WhatsAppService.sendBulkMessages(companyId, waQueue);
            waQueue.forEach((item, i) => {
                notificationsSent.push({ leaderId: item.leaderId, dept: item.dept, success: i < waResults.sent, type: 'whatsapp' });
            });
        }

        return { success: true, notificationsSent: notificationsSent.length, details: notificationsSent };
    }
}

module.exports = new AbsenceService();
