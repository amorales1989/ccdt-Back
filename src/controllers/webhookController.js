const { supabase, supabaseAdmin } = require('../config/supabase');
const WhatsAppService = require('../services/whatsappService');
const mercadopagoService = require('../services/mercadopagoService');
const { recurringAmount } = require('./subscriptionController');

// Actualiza el monto del preapproval de una empresa al plan+packs vigentes. No rompe el flujo si falla.
async function syncPreapprovalAmount(companyId) {
    try {
        const { data: comp } = await supabaseAdmin
            .from('companies')
            .select('mp_preapproval_id, plan, extra_member_packs, billing_cycle')
            .eq('id', companyId)
            .single();
        if (!comp?.mp_preapproval_id) return;

        const { data: planRow } = await supabaseAdmin
            .from('plans')
            .select('value, price_monthly, pack_price_monthly')
            .eq('value', comp.plan)
            .maybeSingle();
        if (!planRow) return;

        const { count: member_count } = await supabaseAdmin
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .is('deleted_at', null);

        const amount = recurringAmount(planRow, comp.extra_member_packs || 0, comp.billing_cycle, member_count || 0);
        await mercadopagoService.updatePreapprovalAmount(comp.mp_preapproval_id, amount);
    } catch (err) {
        console.error('⚠️ No se pudo actualizar el monto del preapproval:', err.message);
    }
}

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
                const result = await WhatsAppService.sendMessage(record.company_id || 1, phone, message);

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

                const broadcastMessage = `${header}\n\n📌 *Título:* ${record.title}\n📅 *Fecha:* ${formattedDate}${time}${desc}\n\n_Mensaje automático de CCDT_`;

                console.log(`🚀 Iniciando difusión de evento: ${record.title}`);

                // Disparamos la difusión en segundo plano para no bloquear el webhook
                broadcastToAll(broadcastMessage, record.company_id || 1);
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

            const message = `✅ *CCDT Bot - Vercel Health Check*\n\nInformo que el sistema de WhatsApp está recibiendo las llamadas de Vercel Cron correctamente.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}\n⏰ Hora Actual: ${new Date().toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' })}\n\n_Seguimos en línea._ ⚡`;

            // sendMessage(companyId, phoneNumber, message): el health-check se envía
            // AL número monitor usando la sesión de la empresa 1 (la del sistema).
            const sent = await WhatsAppService.sendMessage(1, monitorNumber, message);

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
    },

    // POST /api/webhooks/mercadopago - webhook público de Mercado Pago (Paso 1: renovación)
    mercadopago: async (req, res, next) => {
        try {
            const expectedSecret = process.env.MP_WEBHOOK_SECRET;
            const providedSecret = req.query.secret || req.headers['x-webhook-secret'];
            if (expectedSecret && providedSecret !== expectedSecret) {
                return res.status(401).json({ success: false, message: 'Secreto inválido' });
            }

            const kind = req.body?.type || req.query.type || req.query.topic;

            if (kind === 'subscription_preapproval' || kind === 'preapproval') {
                return webhookController._handlePreapproval(req, res);
            }
            if (kind === 'subscription_authorized_payment' || kind === 'authorized_payment') {
                return webhookController._handleAuthorizedPayment(req, res);
            }

            const paymentId = req.body?.data?.id || req.query.id || req.query['data.id'];
            if (!paymentId) {
                return res.json({ success: true, ignored: true });
            }

            let payment;
            try {
                payment = await mercadopagoService.getPayment(paymentId);
            } catch (mpErr) {
                console.error('❌ Error consultando pago MP:', mpErr.message);
                return res.json({ success: true, ignored: true });
            }

            if (payment.status !== 'approved') {
                return res.json({ success: true, ignored: true });
            }

            // Idempotencia: si ya procesamos este mp_payment_id, no aplicar de nuevo.
            const { data: existing } = await supabaseAdmin
                .from('payments')
                .select('id')
                .eq('mp_payment_id', String(paymentId))
                .maybeSingle();
            if (existing) {
                return res.json({ success: true, already_processed: true });
            }

            // Checkout Pro NO propaga el metadata de la preference al payment; el dato confiable
            // es external_reference (`tipo:companyId:extra:timestamp`). Usamos metadata como fallback.
            const metadata = payment.metadata || {};
            const refParts = String(payment.external_reference || '').split(':');
            const type = metadata.type || refParts[0];
            const companyId = metadata.company_id ?? (refParts[1] ? parseInt(refParts[1], 10) : null);

            if (!type || !companyId) {
                return res.json({ success: true, ignored: true });
            }

            if (type === 'renewal') {
                const billing_cycle = (metadata.billing_cycle || refParts[2]) === 'anual' ? 'anual' : 'mensual';

                const { data: comp, error: cErr } = await supabaseAdmin
                    .from('companies').select('due_date, pending_plan, pending_extra_member_packs').eq('id', companyId).single();
                if (cErr) throw cErr;

                const today = new Date();
                const todayStr = today.toISOString().slice(0, 10);
                const base = (comp?.due_date && comp.due_date > todayStr) ? new Date(comp.due_date) : today;
                const periodStart = new Date(base);
                const periodEnd = new Date(base);
                if (billing_cycle === 'anual') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
                else periodEnd.setMonth(periodEnd.getMonth() + 1);
                const due = periodEnd.toISOString().slice(0, 10);

                const { error: payErr } = await supabaseAdmin.from('payments').insert({
                    company_id: companyId,
                    amount: payment.transaction_amount,
                    billing_cycle,
                    period_start: periodStart.toISOString().slice(0, 10),
                    period_end: due,
                    source: 'mp_link',
                    mp_payment_id: String(paymentId),
                });
                if (payErr) throw payErr;

                // Aplicar cambios de plan/packs pendientes (downgrade/remove programados) al renovar.
                const updates = { last_payment_date: todayStr, due_date: due, billing_cycle, is_active: true };
                if (comp?.pending_plan) {
                    updates.plan = comp.pending_plan;
                    updates.pending_plan = null;
                }
                if (comp?.pending_extra_member_packs !== null && comp?.pending_extra_member_packs !== undefined) {
                    updates.extra_member_packs = comp.pending_extra_member_packs;
                    updates.pending_extra_member_packs = null;
                }

                const { error: updErr } = await supabaseAdmin.from('companies')
                    .update(updates)
                    .eq('id', companyId);
                if (updErr) throw updErr;
            } else if (type === 'change_plan') {
                const newPlan = metadata.new_plan || refParts[2];

                const { error: updErr } = await supabaseAdmin.from('companies')
                    .update({ plan: newPlan, pending_plan: null })
                    .eq('id', companyId);
                if (updErr) throw updErr;

                const { error: payErr } = await supabaseAdmin.from('payments').insert({
                    company_id: companyId,
                    amount: payment.transaction_amount,
                    source: 'mp_link',
                    mp_payment_id: String(paymentId),
                    notes: 'cambio de plan',
                });
                if (payErr) throw payErr;

                await syncPreapprovalAmount(companyId);
            } else if (type === 'add_packs') {
                const delta = Number(metadata.delta || refParts[2]) || 0;

                const { data: comp, error: cErr } = await supabaseAdmin
                    .from('companies').select('extra_member_packs').eq('id', companyId).single();
                if (cErr) throw cErr;

                const { error: updErr } = await supabaseAdmin.from('companies')
                    .update({ extra_member_packs: (Number(comp?.extra_member_packs) || 0) + delta })
                    .eq('id', companyId);
                if (updErr) throw updErr;

                const { error: payErr } = await supabaseAdmin.from('payments').insert({
                    company_id: companyId,
                    amount: payment.transaction_amount,
                    source: 'mp_link',
                    mp_payment_id: String(paymentId),
                    notes: `packs +${delta}`,
                });
                if (payErr) throw payErr;

                await syncPreapprovalAmount(companyId);
            }

            res.json({ success: true, processed: true });
        } catch (error) {
            console.error('❌ Error en webhook mercadopago:', error.message);
            res.json({ success: true, error: true });
        }
    },

    // Notificación de cambio de estado de la suscripción (preapproval).
    _handlePreapproval: async (req, res) => {
        try {
            const id = req.body?.data?.id || req.query.id || req.query['data.id'];
            if (!id) return res.json({ success: true, ignored: true });

            let preapproval;
            try {
                preapproval = await mercadopagoService.getPreapproval(id);
            } catch (mpErr) {
                console.error('❌ Error consultando preapproval MP:', mpErr.message);
                return res.json({ success: true, ignored: true });
            }

            const { data: comp } = await supabaseAdmin
                .from('companies')
                .select('id, is_active')
                .eq('mp_preapproval_id', String(id))
                .maybeSingle();
            if (!comp) return res.json({ success: true, ignored: true });

            const updates = { subscription_status: preapproval.status };
            if (preapproval.status === 'authorized') updates.is_active = true;

            const { error: updErr } = await supabaseAdmin.from('companies').update(updates).eq('id', comp.id);
            if (updErr) throw updErr;

            res.json({ success: true, processed: true });
        } catch (error) {
            console.error('❌ Error en webhook mercadopago (preapproval):', error.message);
            res.json({ success: true, error: true });
        }
    },

    // Notificación de cada cobro recurrente de la suscripción (authorized_payment).
    _handleAuthorizedPayment: async (req, res) => {
        try {
            const id = req.body?.data?.id || req.query.id || req.query['data.id'];
            if (!id) return res.json({ success: true, ignored: true });

            let authPayment;
            try {
                authPayment = await mercadopagoService.getAuthorizedPayment(id);
            } catch (mpErr) {
                console.error('❌ Error consultando authorized_payment MP:', mpErr.message);
                return res.json({ success: true, ignored: true });
            }

            if (authPayment.status !== 'approved') {
                return res.json({ success: true, ignored: true });
            }

            const mpPaymentId = `authpay:${id}`;
            const { data: existing } = await supabaseAdmin
                .from('payments')
                .select('id')
                .eq('mp_payment_id', mpPaymentId)
                .maybeSingle();
            if (existing) {
                return res.json({ success: true, already_processed: true });
            }

            const preapprovalId = authPayment.preapproval_id;
            const { data: comp, error: cErr } = await supabaseAdmin
                .from('companies')
                .select('id, due_date, billing_cycle, pending_plan, pending_extra_member_packs')
                .eq('mp_preapproval_id', String(preapprovalId))
                .maybeSingle();
            if (cErr) throw cErr;
            if (!comp) return res.json({ success: true, ignored: true });

            const billing_cycle = comp.billing_cycle === 'anual' ? 'anual' : 'mensual';

            const today = new Date();
            const todayStr = today.toISOString().slice(0, 10);
            const base = (comp.due_date && comp.due_date > todayStr) ? new Date(comp.due_date) : today;
            const periodStart = new Date(base);
            const periodEnd = new Date(base);
            if (billing_cycle === 'anual') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            else periodEnd.setMonth(periodEnd.getMonth() + 1);
            const due = periodEnd.toISOString().slice(0, 10);

            const { error: payErr } = await supabaseAdmin.from('payments').insert({
                company_id: comp.id,
                amount: authPayment.transaction_amount,
                billing_cycle,
                period_start: periodStart.toISOString().slice(0, 10),
                period_end: due,
                source: 'mp_subscription',
                mp_payment_id: mpPaymentId,
            });
            if (payErr) throw payErr;

            const updates = { last_payment_date: todayStr, due_date: due, is_active: true };
            if (comp.pending_plan) {
                updates.plan = comp.pending_plan;
                updates.pending_plan = null;
            }
            if (comp.pending_extra_member_packs !== null && comp.pending_extra_member_packs !== undefined) {
                updates.extra_member_packs = comp.pending_extra_member_packs;
                updates.pending_extra_member_packs = null;
            }

            const { error: updErr } = await supabaseAdmin.from('companies').update(updates).eq('id', comp.id);
            if (updErr) throw updErr;

            await syncPreapprovalAmount(comp.id);

            res.json({ success: true, processed: true });
        } catch (error) {
            console.error('❌ Error en webhook mercadopago (authorized_payment):', error.message);
            res.json({ success: true, error: true });
        }
    },
};

/**
 * Helper para enviar mensajes a todos los perfiles con teléfono
 */
async function broadcastToAll(message, companyId) {
    try {
        // Leer roles configurados para notificación de eventos aprobados
        const { data: companyConfig } = await supabase
            .from('companies')
            .select('notification_settings')
            .eq('id', companyId)
            .single();
        const configuredRoles = companyConfig?.notification_settings?.eventos_aprobados || ['director', 'vicedirector'];

        if (!configuredRoles.length) {
            console.log('⚠️ No hay roles configurados para eventos_aprobados — no se envía nada.');
            return;
        }

        // Traer todos los profiles de la company (filtramos en JS para considerar role primario, roles[] y assignments[])
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, first_name, phone, role, roles, assignments')
            .eq('company_id', companyId)
            .not('phone', 'is', null);

        if (error) throw error;
        if (!profiles || profiles.length === 0) return;

        const wantedSet = new Set(configuredRoles);
        const matchesRole = (p) => {
            if (p.role && wantedSet.has(p.role)) return true;
            if (Array.isArray(p.roles) && p.roles.some(r => wantedSet.has(r))) return true;
            if (Array.isArray(p.assignments) && p.assignments.some(a => a && a.role && wantedSet.has(a.role))) return true;
            return false;
        };

        const recipients = profiles
            .filter(p => p.phone && String(p.phone).trim() !== '' && matchesRole(p))
            .map(p => ({ phone: p.phone, name: p.first_name }));

        if (recipients.length === 0) {
            console.log('⚠️ Ningún profile coincide con los roles configurados.');
            return;
        }

        console.log(`👥 Difundiendo a ${recipients.length} usuarios (roles: ${configuredRoles.join(', ')}, delay 15-30s)...`);
        const result = await WhatsAppService.sendBulkMessages(companyId, recipients, message);
        console.log(`🏁 Difusión masiva completada. Enviados: ${result.sent}, Fallidos: ${result.failed}.`);
    } catch (err) {
        console.error('❌ Error en difusión masiva:', err.message);
    }
}

module.exports = webhookController;
