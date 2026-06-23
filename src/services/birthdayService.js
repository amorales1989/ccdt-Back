const { supabase } = require('../config/supabase');
const NotificationService = require('./notificationService');
const WhatsAppService = require('./whatsappService');

class BirthdayService {
    async checkDailyBirthdays(companyId = null) {
        try {
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentDay = today.getDate();

            console.log(`🎂 [BirthdayService] Buscando cumpleaños para la fecha: ${currentDay}/${currentMonth}`);

            // 1. Obtener todos los estudiantes (no eliminados)
            const { data: students, error } = await supabase
                .from('students')
                .select(`
          id,
          first_name,
          last_name,
          birthdate,
          department_id,
          assigned_class,
          departments (name)
        `)
                .not('birthdate', 'is', null)
                .is('deleted_at', null)
                .eq('company_id', companyId || 1);

            if (error) throw error;

            // Filtrar los que cumplen años hoy
            const birthdayStudents = students.filter(student => {
                const [year, month, day] = student.birthdate.split('-').map(Number);
                return month === currentMonth && day === currentDay;
            });

            console.log(`🎉 [BirthdayService] Encontrados ${birthdayStudents.length} cumpleañeros hoy.`);

            if (birthdayStudents.length === 0) {
                return {
                    success: true,
                    message: 'No hay cumpleaños hoy',
                    count: 0
                };
            }

            // 2. Traer departamentos secundarios (student_departments) de los cumpleañeros
            const birthdayIds = birthdayStudents.map(s => s.id);
            const { data: deptAssignments, error: assignError } = await supabase
                .from('student_departments')
                .select('student_id, department_id, assigned_class, departments(name)')
                .in('student_id', birthdayIds)
                .eq('company_id', companyId || 1);

            if (assignError) {
                console.error('❌ [BirthdayService] Error trayendo departamentos secundarios:', assignError.message);
            }

            // 3. Agrupar por departamento (primario + secundarios), guardando la clase de cada membresía
            const studentsByDept = {};
            const addMembership = (student, deptId, deptName, assignedClass) => {
                if (!deptId) return;
                if (!studentsByDept[deptId]) {
                    studentsByDept[deptId] = { deptName, students: [], seen: new Set() };
                }
                if (studentsByDept[deptId].seen.has(student.id)) return;
                studentsByDept[deptId].seen.add(student.id);
                // assigned_class por membresía: en el dept secundario puede diferir del primario
                studentsByDept[deptId].students.push({ ...student, assigned_class: assignedClass });
            };

            birthdayStudents.forEach(student => {
                addMembership(student, student.department_id, student.departments?.name, student.assigned_class);
            });
            (deptAssignments || []).forEach(a => {
                const student = birthdayStudents.find(s => s.id === a.student_id);
                if (student) addMembership(student, a.department_id, a.departments?.name, a.assigned_class);
            });

            const notificationsSent = [];
            const waQueue = []; // Acumulamos envíos de WhatsApp para mandarlos secuencialmente con delay al final

            // Leer roles configurados para notificaciones de cumpleaños (una vez)
            const { data: companyData } = await supabase
                .from('companies')
                .select('notification_settings')
                .eq('id', companyId || 1)
                .single();
            const birthdayRoles = companyData?.notification_settings?.cumpleanos || ['lider', 'maestro'];

            // 4. Notificar líderes por departamento
            for (const deptId in studentsByDept) {
                const { deptName, students } = studentsByDept[deptId];
                const studentNames = students.map(s => `${s.first_name} ${s.last_name}`).join(', ');

                console.log(`📍 [BirthdayService] Procesando departamento ${deptName} (${deptId}): ${studentNames}`);

                // Buscar usuarios con los roles configurados (incluyendo teléfono)
                const { data: leaders, error: leaderError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email, phone, role, assigned_class')
                    .in('role', birthdayRoles)
                    .eq('department_id', deptId)
                    .eq('company_id', companyId || 1);

                if (leaderError) {
                    console.error(`❌ [BirthdayService] Error buscando líderes para dept ${deptId}:`, leaderError.message);
                    continue;
                }

                if (!leaders || leaders.length === 0) {
                    console.log(`⚠️ [BirthdayService] No se encontraron líderes para el departamento ${deptName}`);
                    continue;
                }

                // Enviar notificaciones
                for (const leader of leaders) {
                    try {
                        // Filtrar alumnos que pertenecen a la clase de este líder/maestro
                        // Si el líder no tiene clase asignada, ve a todos los del departamento
                        const relevantStudents = students.filter(s =>
                            !leader.assigned_class ||
                            leader.assigned_class.toLowerCase() === s.assigned_class?.toLowerCase()
                        );

                        if (relevantStudents.length === 0) continue;

                        const relevantStudentNames = relevantStudents.map(s => `${s.first_name} ${s.last_name}`).join(', ');
                        const title = `🎂 ¡Cumpleaños en ${deptName}!`;
                        const body = relevantStudents.length === 1
                            ? `Hoy es el cumpleaños de ${relevantStudentNames}`
                            : `Hoy cumplen años: ${relevantStudentNames}`;

                        // A. Notificación Push (Firebase)
                        const result = await NotificationService.enviarAUsuario(leader.id, {
                            titulo: title,
                            cuerpo: body
                        }, {
                            tipo: 'cumpleanos',
                            departmentId: deptId,
                            studentIds: JSON.stringify(relevantStudents.map(s => s.id))
                        });

                        notificationsSent.push({
                            leaderId: leader.id,
                            dept: deptName,
                            success: result.success,
                            type: 'fcm'
                        });

                        // B. Notificación WhatsApp (Baileys) — encolar para envío secuencial con delay
                        if (leader.phone) {
                            const waText = `🎂 *¡Cumpleaños en ${deptName}!* 🎂\n\n${body}\n\n_Enviado automáticamente por CCDT Bot_`;
                            waQueue.push({
                                phone: leader.phone,
                                message: waText,
                                name: leader.first_name,
                                leaderId: leader.id,
                                dept: deptName,
                            });
                        }
                    } catch (notifyError) {
                        console.error(`❌ [BirthdayService] Error notificando al líder ${leader.id}:`, notifyError.message);
                    }
                }
            }

            // Procesar cola de WhatsApp con delay aleatorio 15-30s entre envíos (evita bloqueos por spam)
            if (waQueue.length > 0) {
                console.log(`📤 [BirthdayService] Enviando ${waQueue.length} WhatsApp de cumpleaños con delay 15-30s...`);
                const waResults = await WhatsAppService.sendBulkMessages(companyId || 1, waQueue);
                waQueue.forEach((item, i) => {
                    notificationsSent.push({
                        leaderId: item.leaderId,
                        leaderName: item.name,
                        dept: item.dept,
                        success: i < waResults.sent,
                        type: 'whatsapp'
                    });
                });
            }

            return {
                success: true,
                message: 'Verificación de cumpleaños completada',
                birthdaysFound: birthdayStudents.length,
                notificationsSent: notificationsSent.length,
                details: notificationsSent
            };

        } catch (error) {
            console.error('❌ [BirthdayService] Error crítico:', error);
            throw error;
        }
    }
}

module.exports = new BirthdayService();
