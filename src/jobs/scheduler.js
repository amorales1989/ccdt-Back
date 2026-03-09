const cron = require('node-cron');
const BirthdayService = require('../services/birthdayService');
const WhatsAppService = require('../services/whatsappService');

const initScheduledJobs = () => {
    console.log('⏰ Inicializando Cron Jobs...');

    // Health Check Cada 1 Minuto (Pedido por usuario)
    cron.schedule('* * * * *', async () => {
        const monitorNumber = process.env.MONITOR_WHATSAPP_NUMBER;
        if (!monitorNumber) return;

        try {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

            // Enviamos con la empresa 1 por defecto
            await WhatsAppService.sendMessage(1, monitorNumber,
                `🤖 *Monitoreo Activo*\n\nEstado: Línea ✅\nHora: ${timeStr}\n\n_CCDT Bot_`
            );
            console.log(`⏱️ [Cron Job] Monitoreo enviado a ${monitorNumber}`);
        } catch (error) {
            console.error('❌ [Cron Job] Error en monitoreo 1m:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Monitoreo automático cada 1 minuto');

    // Programar tarea para las 9:00 AM todos los días
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ [Cron Job] Ejecutando verificación diaria de cumpleaños (9:00 AM)...');
        try {
            const result = await BirthdayService.checkDailyBirthdays();
            console.log('✅ [Cron Job] Finalizado:', result);
        } catch (error) {
            console.error('❌ [Cron Job] Error en ejecución:', error);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Verificación de cumpleaños diaria a las 09:00 AM');

    // Health Check detallado (9:00 AM)
    cron.schedule('0 9 * * *', async () => {
        const monitorNumber = process.env.MONITOR_WHATSAPP_NUMBER;
        if (!monitorNumber) return;

        console.log('⏰ [Cron Job] Ejecutando Health Check detallado (9:00 AM)...');
        try {
            await WhatsAppService.sendMessage(1, monitorNumber,
                `✅ *CCDT Bot - Reporte Matutino*\n\nEl sistema de WhatsApp está vinculado y operativo.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR')}\n⏰ Hora: ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n\n_Buen día._ ☀️`
            );
            console.log('✅ [Cron Job] Health Check matutino enviado.');
        } catch (error) {
            console.error('❌ [Cron Job] Error en Health Check matutino:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Health Check diario a las 09:00 AM');

    // Health Check detallado (23:00)
    cron.schedule('0 23 * * *', async () => {
        const monitorNumber = process.env.MONITOR_WHATSAPP_NUMBER;
        if (!monitorNumber) return;

        console.log('⏰ [Cron Job] Ejecutando Health Check nocturno (23:00)...');
        try {
            await WhatsAppService.sendMessage(1, monitorNumber,
                `🌙 *CCDT Bot - Reporte Final*\n\nEl sistema cierra el día operativo y conectado.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR')}\n⏰ Hora: ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n\n_Hasta mañana._ 💤`
            );
            console.log('✅ [Cron Job] Health Check nocturno enviado.');
        } catch (error) {
            console.error('❌ [Cron Job] Error en Health Check nocturno:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Health Check diario a las 23:00 PM');

};

module.exports = initScheduledJobs;
