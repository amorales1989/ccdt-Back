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

            // 2. Agrupar por departamento
            const studentsByDept = {};
            birthdayStudents.forEach(student => {
                if (!student.department_id) return;

                if (!studentsByDept[student.department_id]) {
                    studentsByDept[student.department_id] = {
                        deptName: student.departments?.name,
                        students: []
                    };
                }
                studentsByDept[student.department_id].students.push(student);
            });

            const notificationsSent = [];

            // 3. Notificar líderes por departamento
            for (const deptId in studentsByDept) {
                const { deptName, students } = studentsByDept[deptId];
                const studentNames = students.map(s => `${s.first_name} ${s.last_name}`).join(', ');

                console.log(`📍 [BirthdayService] Procesando departamento ${deptName} (${deptId}): ${studentNames}`);

                // Buscar líderes y maestros (incluyendo teléfono)
                const { data: leaders, error: leaderError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email, phone, role, assigned_class')
                    .in('role', ['lider', 'maestro'])
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

                        // B. Notificación WhatsApp (Baileys)
                        if (leader.phone) {
                            console.log(`📤 [BirthdayService] Intentando enviar WhatsApp a ${leader.first_name} (${leader.phone})...`);
                            const waText = `🎂 *¡Cumpleaños en ${deptName}!* 🎂\n\n${body}\n\n_Enviado automáticamente por CCDT Bot_`;

                            const waResult = await WhatsAppService.sendMessage(companyId || 1, leader.phone, waText);

                            if (waResult) {
                                console.log(`✅ [BirthdayService] WhatsApp enviado a ${leader.first_name}`);
                            } else {
                                console.warn(`⚠️ [BirthdayService] Falló envío WhatsApp a ${leader.first_name}`);
                            }

                            notificationsSent.push({
                                leaderId: leader.id,
                                leaderName: leader.first_name,
                                dept: deptName,
                                success: waResult,
                                type: 'whatsapp'
                            });
                        }
                    } catch (notifyError) {
                        console.error(`❌ [BirthdayService] Error notificando al líder ${leader.id}:`, notifyError.message);
                    }
                }
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
