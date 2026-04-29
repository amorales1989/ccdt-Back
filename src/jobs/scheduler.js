const cron = require('node-cron');
const BirthdayService = require('../services/birthdayService');
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
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Reporte nocturno a las 21:00 PM');

    // Alerta Diaria (9:00 AM) - Solicitudes de Eventos Pendientes
    cron.schedule('0 9 * * *', async () => {
        const adminPhone = '1159080306'; // Número a notificar (General o específico de Co 1)
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

                    // 3. Obtener teléfonos de secretarios de calendario DE ESTA EMPRESA
                    const { data: secretaries } = await supabaseAdmin
                        .from('profiles')
                        .select('phone')
                        .eq('role', 'secr.-calendario')
                        .eq('company_id', companyId)
                        .not('phone', 'is', null);

                    const recipients = new Set();
                    if (companyId === 1) recipients.add(adminPhone); // Admin general solo recibe de Co 1 por defecto

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

                    // Enviar a todos los destinatarios usando el WhatsApp de LA EMPRESA
                    for (const phone of recipients) {
                        try {
                            await WhatsAppService.sendMessage(companyId, phone, message);
                            console.log(`✅ [Cron Job] Alerta enviada a ${phone} (Empresa ${companyId}).`);
                        } catch (sendError) {
                            console.log(`❌ [Cron Job] Error enviando a ${phone} (Empresa ${companyId}):`, sendError.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ [Cron Job] Error crítico en alertas de solicitudes:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Alerta de solicitudes pendientes a las 09:00 AM');

};

module.exports = initScheduledJobs;
