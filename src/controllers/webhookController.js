const { supabase } = require('../config/supabase');
const WhatsAppService = require('../services/whatsappService');

/**
 * Controlador para manejar webhooks de Supabase
 */
const webhookController = {
    handleProfileWebhook: async (req, res, next) => {
        try {
            // Supabase Webhook payload structure:
            // { type, table, schema, record, old_record }
            const { type, table, record, old_record } = req.body;

            console.log(`📡 Webhook recibido: ${type} en tabla ${table}`);

            // Solo nos interesa la tabla profiles
            if (table !== 'profiles') {
                return res.status(400).json({ success: false, message: 'Tabla no válida' });
            }

            const phone = record.phone;
            const oldPhone = old_record ? old_record.phone : null;
            const name = record.first_name || 'líder';

            // Lógica: Se envía el mensaje si es un nuevo registro con teléfono 
            // O si es una actualización donde el teléfono antes era nulo o diferente
            const isNewPhone = phone && (!oldPhone || phone !== oldPhone);

            if (isNewPhone) {
                console.log(`🤖 Detectado nuevo número para ${name}: ${phone}. Enviando presentación...`);

                const message = `¡Hola ${name}! Soy el bot de *CCDT*. 🤖\n\nBienvenido/a. Este será tu canal oficial para recibir notificaciones automáticas relevantes.\n\nNo es necesario que respondas a este mensaje. ¡Que tengas un gran día! ⚡`;

                // Enviar mensaje
                const result = await WhatsAppService.sendMessage(phone, message);

                if (result) {
                    console.log(`✅ Saludo automatizado enviado a ${name}`);
                } else {
                    console.warn(`⚠️ No se pudo enviar el saludo a ${name}`);
                }
            } else {
                console.log('ℹ️ No hubo cambios en el teléfono que requieran saludo.');
            }

            res.json({ success: true, processed: true });
        } catch (error) {
            console.error('❌ Error en handleProfileWebhook:', error.message);
            next(error);
        }
    },

    handleEventWebhook: async (req, res, next) => {
        try {
            const { type, table, record, old_record } = req.body;

            console.log(`📡 Event Webhook recibido: ${type} en tabla ${table}`);

            if (table !== 'events') {
                return res.status(400).json({ success: false, message: 'Tabla no válida' });
            }

            // Un evento se considera "difundible" si no es una solicitud pendiente
            const isConfirmed = record.solicitud === false || record.estado === 'aprobado';

            // Si es un UPDATE, solo avisamos si se mantiene confirmado o si RECIÉN se aprobó
            let shouldNotify = false;
            let header = '';

            if (type === 'INSERT' && isConfirmed) {
                shouldNotify = true;
                header = '🆕 *Nuevo Evento Confirmado*';
            } else if (type === 'UPDATE' && isConfirmed) {
                // Notificamos si antes no era confirmado y ahora sí (aprobación)
                // O si simplemente hubo un cambio en un evento ya confirmado
                const wasConfirmed = old_record && (old_record.solicitud === false || old_record.estado === 'aprobado');

                if (!wasConfirmed) {
                    header = '✅ *Evento Aprobado*';
                    shouldNotify = true;
                } else {
                    header = '🔄 *Evento Actualizado*';
                    shouldNotify = true;
                }
            }

            if (shouldNotify) {
                const dateParts = record.date.split('-');
                const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                const time = record.time ? `\n⏰ *Hora:* ${record.time}` : '';
                const desc = record.description ? `\n📝 *Descripción:* ${record.description}` : '';

                const broadcastMessage = `${header}\n\n📌 *Título:* ${record.title}\n📅 *Fecha:* ${formattedDate}${time}${desc}\n\n_Accede a la app para más detalles._`;

                console.log(`🚀 Iniciando difusión de evento: ${record.title}`);

                // Disparamos la difusión en segundo plano para no bloquear el webhook
                broadcastToAll(broadcastMessage);
            }

            res.json({ success: true, received: true });
        } catch (error) {
            console.error('❌ Error en handleEventWebhook:', error.message);
            next(error);
        }
    },

    handleCronHealthCheck: async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            const cronSecret = process.env.CRON_SECRET;

            // En Vercel, CRON_SECRET se pasa como 'Bearer <token>'
            if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
                console.warn('⚠️ Intento de acceso no autorizado al Cron Health Check');
                return res.status(401).json({ success: false, message: 'No autorizado' });
            }

            console.log('⏰ Ejecutando Health Check desde Vercel Cron...');

            const monitorNumber = process.env.MONITOR_WHATSAPP_NUMBER;
            if (!monitorNumber) {
                return res.status(500).json({ success: false, message: 'MONITOR_WHATSAPP_NUMBER no configurado' });
            }

            const message = `✅ *CCDT Bot - Vercel Health Check*\n\nInformo que el sistema de WhatsApp está recibiendo las llamadas de Vercel Cron correctamente.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR')}\n⏰ Hora Actual: ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n\n_Seguimos en línea._ ⚡`;

            const sent = await WhatsAppService.sendMessage(monitorNumber, message, true);

            if (sent) {
                console.log('✅ Health Check enviado exitosamente');
                return res.json({ success: true, message: 'Health Check enviado' });
            } else {
                console.error('❌ Falló el envío del Health Check');
                return res.status(503).json({ success: false, message: 'Servicio de WhatsApp no disponible' });
            }
        } catch (error) {
            console.error('❌ Error en handleCronHealthCheck:', error.message);
            next(error);
        }
    }
};

/**
 * Helper para enviar mensajes a todos los perfiles con teléfono
 */
async function broadcastToAll(message) {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('first_name, phone')
            .not('phone', 'is', null);

        if (error) throw error;
        if (!profiles || profiles.length === 0) return;

        console.log(`👥 Difundiendo mensaje a ${profiles.length} usuarios...`);

        for (const profile of profiles) {
            if (profile.phone) {
                await WhatsAppService.sendMessage(profile.phone, message);
                // Delay aleatorio entre 2-4 segundos
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
            }
        }
        console.log('🏁 Difusión masiva completada.');
    } catch (err) {
        console.error('❌ Error en difusión masiva:', err.message);
    }
}

module.exports = webhookController;
