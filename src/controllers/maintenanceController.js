const { supabaseAdmin } = require('../config/supabase');
const NotificationService = require('../services/notificationService');
const WhatsAppService = require('../services/whatsappService');

const maintenanceController = {
    notifyNewRequest: async (req, res, next) => {
        try {
            const {
                title,
                location,
                requesterName,
                description,
                priority
            } = req.body;

            const companyId = req.companyId;

            if (!title || !requesterName) {
                return res.status(400).json({
                    success: false,
                    message: 'Los campos "title" y "requesterName" son requeridos'
                });
            }

            // Estructuramos el mensaje igual que en eventsController
            const priorityEmoji = {
                'alta': '🔴 ALTA',
                'urgente': '🚨 URGENTE',
                'normal': '🟡 Normal',
                'baja': '🟢 Baja'
            }[String(priority).toLowerCase()] || '🟡 Normal';

            const baseWaText = `🔧 *Nueva Solicitud de Mantenimiento*\n\n*Asunto:* ${title}\n*Ubicación:* ${location || '📍 No especificada'}\n*Solicitante:* ${requesterName}\n*Prioridad:* ${priorityEmoji}\n\n`;
            const fullWaText = baseWaText + `*Descripción:* ${description || 'Sin descripción'}\n\n_Accede al panel administrativo para más detalles._`;

            // 1. Notificación Push (FCM) - Usamos enviarPorRol para mayor eficiencia como en eventos
            try {
                console.log('🔄 Enviando notificación Push a conserjes...');
                await NotificationService.enviarPorRol('conserje', {
                    titulo: '🔧 Nueva Solicitud de Mantenimiento',
                    cuerpo: `${requesterName} solicita: ${title}`
                }, {
                    tipo: 'mantenimiento',
                    title,
                    location: location || '',
                    requesterName,
                    priority: priority || 'normal'
                }, '/mantenimiento', companyId);
            } catch (fcmError) {
                console.error('[Mantenimiento] FCM Error:', fcmError.message);
            }

            // 2. Notificación WhatsApp a conserjes
            try {
                console.log('🔄 Buscando teléfonos de conserjes para WhatsApp...');
                const { data: profiles, error: secError } = await supabaseAdmin
                    .from('profiles')
                    .select('first_name, phone, role, roles')
                    .eq('company_id', companyId);

                if (secError) throw secError;

                if (profiles && profiles.length > 0) {
                    // Filtrado idéntico al que funcionó para detectar a Ceci
                    const conserjes = profiles.filter(p => {
                        const mainRole = String(p.role || '').toLowerCase();
                        const rolesArray = Array.isArray(p.roles) ? p.roles.map(r => String(r).toLowerCase()) : [];
                        return mainRole === 'conserje' || rolesArray.includes('conserje');
                    });

                    console.log(`📤 Enviando WhatsApp a ${conserjes.length} conserjes...`);
                    for (const cons of conserjes) {
                        if (cons.phone) {
                            await WhatsAppService.sendMessage(companyId, cons.phone, fullWaText);
                        }
                    }
                }
            } catch (waError) {
                console.error('[Mantenimiento] WhatsApp Error:', waError.message);
            }

            // Responder OK como hace eventos
            res.status(200).json({
                success: true,
                message: 'Solicitud de notificación de mantenimiento procesada'
            });

        } catch (error) {
            console.error('❌ Error general en notifyNewRequest mantenimiento:', error);
            res.status(500).json({
                success: false,
                message: 'Error al procesar notificación',
                error: error.message
            });
        }
    }
};

module.exports = maintenanceController;
