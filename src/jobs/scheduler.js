const cron = require('node-cron');
const Sentry = require('@sentry/node');
const BirthdayService = require('../services/birthdayService');
const AbsenceService = require('../services/absenceService');
const AttendanceReminderService = require('../services/attendanceReminderService');
const WhatsAppService = require('../services/whatsappService');

const initScheduledJobs = () => {
    console.log('⏰ Inicializando Cron Jobs...');

    // Programar tarea para las 8:00 AM todos los días (Cumpleaños)
    cron.schedule('20 8 * * *', async () => {
        console.log('⏰ [Cron Job] Ejecutando verificación diaria de cumpleaños (8:00 AM)...');
        try {
            const { supabaseAdmin } = require('../config/supabase');
            const { data: companies } = await supabaseAdmin.from('companies').select('id');

            if (companies) {
                for (const company of companies) {
                    console.log(`🎂 [Cron Job] Procesando cumpleaños para empresa: ${company.id}`);
                    const result = await BirthdayService.checkDailyBirthdays(company.id);
                    console.log(`✅ [Cron Job] Empresa ${company.id} finalizada:`, result);
                }
            }
        } catch (error) {
            console.error('❌ [Cron Job] Error en ejecución de cumpleaños:', error);
            Sentry.captureException(error, { tags: { job: 'cumpleanios' } });
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Verificación de cumpleaños diaria a las 08:00 AM');

    // Reporte Matutino / Monitoreo (9:00 AM)
    cron.schedule('0 9 * * *', async () => {
        const monitorNumber = process.env.MONITOR_WHATSAPP_NUMBER;
        if (!monitorNumber) return;

        console.log('⏰ [Cron Job] Ejecutando Reporte Matutino (9:00 AM)...');
        try {
            const { supabaseAdmin } = require('../config/supabase');
            const { data: companies } = await supabaseAdmin.from('companies').select('id');

            if (companies) {
                for (const company of companies) {
                    await WhatsAppService.sendMessage(company.id, monitorNumber,
                        `☀️ *CCDT Bot - Reporte Matutino*\n\nEl sistema de WhatsApp está vinculado y operativo para la empresa ${company.id}.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}\n⏰ Hora: ${new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })}\n\n_Buen día._`
                    );
                }
            }
            console.log('✅ [Cron Job] Reportes matutinos enviados.');
        } catch (error) {
            console.error('❌ [Cron Job] Error en Reporte matutino:', error.message);
            Sentry.captureException(error, { tags: { job: 'reporte-matutino' } });
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Reporte matutino a las 09:00 AM');

    // Reporte Nocturno / Monitoreo (21:00 hs)
    cron.schedule('0 21 * * *', async () => {
        const monitorNumber = process.env.MONITOR_WHATSAPP_NUMBER;
        if (!monitorNumber) return;

        console.log('⏰ [Cron Job] Ejecutando Reporte Nocturno (21:00)...');
        try {
            const { supabaseAdmin } = require('../config/supabase');
            const { data: companies } = await supabaseAdmin.from('companies').select('id');

            if (companies) {
                for (const company of companies) {
                    await WhatsAppService.sendMessage(company.id, monitorNumber,
                        `🌙 *CCDT Bot - Reporte Nocturno*\n\nEl sistema sigue operativo y conectado para la empresa ${company.id} para cerrar el día.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}\n⏰ Hora: ${new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })}\n\n_Hasta mañana._ 💤`
                    );
                }
            }
            console.log('✅ [Cron Job] Reportes nocturnos enviados.');
        } catch (error) {
            console.error('❌ [Cron Job] Error en Reporte nocturno:', error.message);
            Sentry.captureException(error, { tags: { job: 'reporte-nocturno' } });
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Reporte nocturno a las 21:00 PM');

    // Alerta Diaria (9:00 AM) - Solicitudes de Eventos Pendientes
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ [Cron Job] Ejecutando Verificación de Solicitudes Pendientes (9:00 AM)...');

        try {
            const { supabaseAdmin } = require('../config/supabase');
            const { data: companies } = await supabaseAdmin.from('companies').select('id');

            if (!companies) return;

            for (const company of companies) {
                const companyId = company.id;
                console.log(`📋 [Cron Job] Procesando solicitudes para empresa: ${companyId}`);

                // 1. Traemos las solicitudes pendientes de ESTA empresa
                const { data: pendingRequests, error } = await supabaseAdmin
                    .from('events')
                    .select('*')
                    .eq('solicitud', true)
                    .eq('company_id', companyId)
                    .in('estado', ['solicitud', 'pendiente', null]);

                if (error) {
                    console.error(`❌ [Cron Job] Error buscando solicitudes para empresa ${companyId}:`, error.message);
                    continue;
                }

                if (pendingRequests && pendingRequests.length > 0) {
                    // 2. Obtener los IDs de solicitantes únicos para buscar sus nombres (filtrado por empresa)
                    const requesterIds = [...new Set(pendingRequests.map(r => r.solicitante).filter(id => id))];

                    let profilesMap = {};
                    if (requesterIds.length > 0) {
                        const { data: profiles } = await supabaseAdmin
                            .from('profiles')
                            .select('id, first_name, last_name')
                            .in('id', requesterIds)
                            .eq('company_id', companyId);

                        if (profiles) {
                            profiles.forEach(p => {
                                profilesMap[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim();
                            });
                        }
                    }

                    // 3. Leer roles configurados para notif. de solicitudes pendientes
                    const { data: companyConfig } = await supabaseAdmin
                        .from('companies')
                        .select('notification_settings')
                        .eq('id', companyId)
                        .single();
                    const pendingRoles = companyConfig?.notification_settings?.solicitudes_pendientes || ['secr.-calendario', 'admin'];

                    // 4. Obtener teléfonos de los roles configurados
                    const { data: secretaries } = await supabaseAdmin
                        .from('profiles')
                        .select('phone')
                        .in('role', pendingRoles)
                        .eq('company_id', companyId)
                        .not('phone', 'is', null);

                    const recipients = new Set();
                    if (companyId === 1) recipients.add('1159080306'); // Admin general fijo empresa 1

                    if (secretaries) {
                        secretaries.forEach(s => {
                            if (s.phone && s.phone.trim()) {
                                recipients.add(s.phone.trim());
                            }
                        });
                    }

                    if (recipients.size === 0) continue;

                    let message = `📋 *RECORDATORIO: ${pendingRequests.length} Solicitud(es) Pendiente(s)*\n\n`;

                    pendingRequests.forEach((req, index) => {
                        const reqDate = new Date(req.created_at || req.date);
                        const today = new Date();

                        // Aseguramos cálculo ignorando la hora
                        const utc1 = Date.UTC(reqDate.getFullYear(), reqDate.getMonth(), reqDate.getDate());
                        const utc2 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

                        const diffMs = utc2 - utc1;
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                        const dayString = diffDays === 1 ? '1 día' : `${diffDays} días`;

                        // Formateo de fecha seguro (YYYY-MM-DD -> DD/MM/YYYY) sin desfases
                        let dateFormatted = 'No especificada';
                        if (req.date) {
                            const parts = req.date.split('T')[0].split('-');
                            if (parts.length === 3) {
                                dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                            }
                        }

                        const solicitanteName = profilesMap[req.solicitante] || (req.solicitante || 'No especificado');

                        message += `*${index + 1}. ${req.title}*\n`;
                        message += `👤 Solicitante: ${solicitanteName}\n`;
                        message += `📅 Para el: ${dateFormatted}\n`;
                        message += `⏳ *Lleva ${dayString} pendiente*\n\n`;
                    });

                    message += `_Por favor, ingresa al panel de control para revisarlas._`;

                    // Enviar a todos los destinatarios usando el WhatsApp de LA EMPRESA, con delay 15-30s entre envíos
                    const bulkRecipients = recipients.map(phone => ({ phone }));
                    const bulkResult = await WhatsAppService.sendBulkMessages(companyId, bulkRecipients, message);
                    console.log(`✅ [Cron Job] Alertas finalizadas en Empresa ${companyId}. Enviados: ${bulkResult.sent}, Fallidos: ${bulkResult.failed}.`);
                }
            }
        } catch (error) {
            console.error('❌ [Cron Job] Error crítico en alertas de solicitudes:', error.message);
            Sentry.captureException(error, { tags: { job: 'solicitudes-pendientes' } });
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Alerta de solicitudes pendientes a las 09:00 AM');

    // Recordatorio de vencimiento de suscripción (10:00 AM)
    cron.schedule('0 10 * * *', async () => {
        console.log('⏰ [Cron Job] Verificación de vencimientos de suscripción (10:00 AM)...');
        try {
            const { supabaseAdmin } = require('../config/supabase');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { data: companies } = await supabaseAdmin
                .from('companies')
                .select('id, name, due_date')
                .not('due_date', 'is', null);

            if (!companies) return;

            const REMIND_DAYS = [7, 3, 1];

            for (const c of companies) {
                const due = new Date(`${c.due_date}T00:00:00`);
                const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);

                let message = null;
                if (diffDays > 0 && REMIND_DAYS.includes(diffDays)) {
                    message = `⚠️ *CCDT — Suscripción por vencer*\n\nTu suscripción vence el ${due.toLocaleDateString('es-AR')} (en ${diffDays} día${diffDays === 1 ? '' : 's'}).\n\nRenovala desde *Configuración › Plan* para no interrumpir el servicio.`;
                } else if (diffDays === 0) {
                    message = `🔴 *CCDT — Suscripción vencida hoy*\n\nRegularizá el pago desde *Configuración › Plan* para mantener el acceso activo.`;
                }
                if (!message) continue;

                // Destinatarios: admin y secretaria con teléfono cargado.
                const { data: recips } = await supabaseAdmin
                    .from('profiles')
                    .select('phone')
                    .eq('company_id', c.id)
                    .in('role', ['admin', 'secretaria'])
                    .not('phone', 'is', null);

                const bulk = (recips || [])
                    .filter(r => r.phone && String(r.phone).trim() !== '')
                    .map(r => ({ phone: String(r.phone).trim() }));
                if (bulk.length === 0) continue;

                const result = await WhatsAppService.sendBulkMessages(c.id, bulk, message);
                console.log(`✅ [Cron Job] Vencimiento empresa ${c.id} (${diffDays}d): enviados ${result.sent}, fallidos ${result.failed}.`);
            }
        } catch (error) {
            console.error('❌ [Cron Job] Error en recordatorios de vencimiento:', error.message);
            Sentry.captureException(error, { tags: { job: 'vencimiento-suscripcion' } });
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Recordatorio de vencimiento de suscripción a las 10:00 AM');

    // Verificación de ausencias (8:40 AM) - Alumnos sin asistir a las últimas 4 clases
    cron.schedule('40 8 * * *', async () => {
        console.log('⏰ [Cron Job] Ejecutando verificación de ausencias (8:40 AM)...');
        try {
            const { supabaseAdmin } = require('../config/supabase');
            const { data: companies } = await supabaseAdmin.from('companies').select('id');

            if (companies) {
                for (const company of companies) {
                    const result = await AbsenceService.checkAbsentStudents(company.id);
                    console.log(`✅ [Cron Job] Ausencias empresa ${company.id}:`, result);
                }
            }
        } catch (error) {
            console.error('❌ [Cron Job] Error en verificación de ausencias:', error);
            Sentry.captureException(error, { tags: { job: 'ausencias' } });
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Verificación de ausencias diaria a las 08:40 AM');

    // Verificación de asistencia sin tomar (8:35 AM) - Clases con actividad ayer sin asistencia registrada
    cron.schedule('35 8 * * *', async () => {
        console.log('⏰ [Cron Job] Ejecutando verificación de asistencia sin tomar (8:35 AM)...');
        try {
            const { supabaseAdmin } = require('../config/supabase');
            const { data: companies } = await supabaseAdmin.from('companies').select('id');

            if (companies) {
                for (const company of companies) {
                    const result = await AttendanceReminderService.checkMissingAttendance(company.id);
                    console.log(`✅ [Cron Job] Asistencia sin tomar empresa ${company.id}:`, result);
                }
            }
        } catch (error) {
            console.error('❌ [Cron Job] Error en verificación de asistencia sin tomar:', error);
            Sentry.captureException(error, { tags: { job: 'asistencia-no-tomada' } });
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Verificación de asistencia sin tomar diaria a las 08:35 AM');

    // Cierre global de sesiones (00:00) - fuerza relogin diario en todas las empresas.
    // Supabase no tiene revocación bulk de refresh tokens; en vez de eso marcamos
    // sessions_invalidated_at y authMiddleware.js rechaza cualquier token emitido antes.
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ [Cron Job] Ejecutando cierre global de sesiones (00:00)...');
        try {
            const { supabaseAdmin } = require('../config/supabase');
            const { error } = await supabaseAdmin
                .from('companies')
                .update({ sessions_invalidated_at: new Date().toISOString() })
                .not('id', 'is', null);
            if (error) throw error;
            console.log('✅ [Cron Job] Sesiones invalidadas para todas las empresas.');
        } catch (error) {
            console.error('❌ [Cron Job] Error en cierre global de sesiones:', error);
            Sentry.captureException(error, { tags: { job: 'cierre-sesiones' } });
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Cierre global de sesiones diario a las 00:00');

};

module.exports = initScheduledJobs;
