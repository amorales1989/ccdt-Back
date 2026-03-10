const cron = require('node-cron');
const BirthdayService = require('../services/birthdayService');
const WhatsAppService = require('../services/whatsappService');

const initScheduledJobs = () => {
    console.log('⏰ Inicializando Cron Jobs...');

    // Programar tarea para las 9:00 AM todos los días (Cumpleaños)
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

    // Reporte Matutino / Monitoreo (9:00 AM)
    cron.schedule('0 9 * * *', async () => {
        const monitorNumber = process.env.MONITOR_WHATSAPP_NUMBER;
        if (!monitorNumber) return;

        console.log('⏰ [Cron Job] Ejecutando Reporte Matutino (9:00 AM)...');
        try {
            await WhatsAppService.sendMessage(1, monitorNumber,
                `☀️ *CCDT Bot - Reporte Matutino*\n\nEl sistema de WhatsApp está vinculado y operativo.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR')}\n⏰ Hora: ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n\n_Buen día._`
            );
            console.log('✅ [Cron Job] Reporte matutino enviado.');
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
            await WhatsAppService.sendMessage(1, monitorNumber,
                `🌙 *CCDT Bot - Reporte Nocturno*\n\nEl sistema sigue operativo y conectado para cerrar el día.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR')}\n⏰ Hora: ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n\n_Hasta mañana._ 💤`
            );
            console.log('✅ [Cron Job] Reporte nocturno enviado.');
        } catch (error) {
            console.error('❌ [Cron Job] Error en Reporte nocturno:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Reporte nocturno a las 21:00 PM');

};

module.exports = initScheduledJobs;
