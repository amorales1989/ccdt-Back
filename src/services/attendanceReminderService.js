const { supabase } = require('../config/supabase');
const NotificationService = require('./notificationService');
const WhatsAppService = require('./whatsappService');

const norm = (v) => (v || '').toString().toLowerCase().trim();

// Ayer en zona horaria de Argentina (YYYY-MM-DD)
const yesterdayInAR = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
};

const weekdayOf = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

const formatDate = (isoDate) => {
    const [, m, d] = isoDate.split('-');
    return `${d}/${m}`;
};

class AttendanceReminderService {
    // Notifica (push + WhatsApp) a maestros/líderes/auxiliares cuando su clase tuvo
    // actividad ayer y no se registró ninguna fila de asistencia para ese día.
    async checkMissingAttendance(companyId) {
        const yesterday = yesterdayInAR();
        const yesterdayDow = weekdayOf(yesterday);

        const { data: departments, error: deptErr } = await supabase
            .from('departments')
            .select('id, name, classes, activity_days')
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
        const reminderRoles = companyData?.notification_settings?.asistencia_no_tomada
            || ['lider', 'maestro', 'auxiliar_maestro'];

        const notificationsSent = [];
        const waQueue = [];

        for (const dept of dueDepartments) {
            const [{ data: primary }, { data: secondary }] = await Promise.all([
                supabase
                    .from('students')
                    .select('id, assigned_class')
                    .eq('department_id', dept.id)
                    .eq('company_id', companyId)
                    .is('deleted_at', null),
                supabase
                    .from('student_departments')
                    .select('student_id, assigned_class, students!inner(id, deleted_at)')
                    .eq('department_id', dept.id)
                    .eq('company_id', companyId)
                    .is('students.deleted_at', null),
            ]);

            // clase (normalizada) -> Set(studentId), sin duplicar alumno primario + secundario
            const classSets = {};
            const addRoster = (cls, studentId) => {
                const c = norm(cls);
                if (!c || !studentId) return;
                classSets[c] ??= new Set();
                classSets[c].add(studentId);
            };
            (primary || []).forEach((s) => addRoster(s.assigned_class, s.id));
            (secondary || []).forEach((a) => addRoster(a.assigned_class, a.student_id));
            if (Object.keys(classSets).length === 0) continue;

            const { data: att, error: attErr } = await supabase
                .from('attendance')
                .select('assigned_class')
                .eq('department_id', dept.id)
                .eq('company_id', companyId)
                .eq('date', yesterday);
            if (attErr) {
                console.error(`❌ [AttendanceReminderService] Error trayendo asistencia de dept ${dept.id}:`, attErr.message);
                continue;
            }
            const takenClasses = new Set((att || []).map((a) => norm(a.assigned_class)));

            // clases con alumnos que no tienen ninguna fila de asistencia registrada ayer
            const missingClasses = (dept.classes || [])
                .map((label) => ({ label, key: norm(label) }))
                .filter(({ key }) => classSets[key]?.size > 0 && !takenClasses.has(key));
            if (missingClasses.length === 0) continue;

            const { data: leaders } = await supabase
                .from('profiles')
                .select('id, first_name, phone, role, assigned_class')
                .in('role', reminderRoles)
                .eq('department_id', dept.id)
                .eq('company_id', companyId);
            if (!leaders || leaders.length === 0) continue;

            for (const leader of leaders) {
                // Solo se avisa de la clase propia: sin assigned_class no hay "su clase" que reportar.
                if (!leader.assigned_class) continue;
                const relevant = missingClasses.filter((c) => norm(leader.assigned_class) === c.key);
                if (relevant.length === 0) continue;

                const classNames = relevant.map((c) => c.label).join(', ');
                const title = `📋 Asistencia sin tomar en ${dept.name}`;
                const body = `No se registró la asistencia de "${classNames}" del ${formatDate(yesterday)}. Por favor, registrala a la brevedad.`;

                try {
                    const result = await NotificationService.enviarAUsuario(leader.id, { titulo: title, cuerpo: body }, {
                        tipo: 'asistencia_no_tomada',
                        departmentId: dept.id,
                    });
                    notificationsSent.push({ leaderId: leader.id, dept: dept.name, success: result.success, type: 'fcm' });
                } catch (notifyError) {
                    console.error(`❌ [AttendanceReminderService] Error notificando (push) a ${leader.id}:`, notifyError.message);
                }

                if (leader.phone) {
                    waQueue.push({
                        phone: leader.phone,
                        message: `📋 *Asistencia sin tomar en ${dept.name}*\n\n${body}\n\n_Enviado automáticamente por CCDT Bot_`,
                        name: leader.first_name,
                        leaderId: leader.id,
                        dept: dept.name,
                    });
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

module.exports = new AttendanceReminderService();
