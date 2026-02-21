const cron = require('node-cron');
const BirthdayService = require('../services/birthdayService');
const WhatsAppService = require('../services/whatsappService');

const initScheduledJobs = () => {
    console.log('⏰ Inicializando Cron Jobs...');

    // Programar tarea para las 9:00 AM todos los días
    // Formato: segundo (opcional), minuto, hora, dia del mes, mes, dia de la semana
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
        timezone: "America/Argentina/Buenos_Aires" // Ajusta según tu zona horaria si es necesario
    });

    console.log('📅 Tarea programada: Verificación de cumpleaños diaria a las 09:00 AM');

    // Health Check diario para verificar conexión (9:00 AM)
    cron.schedule('37 19 * * *', async () => {
        console.log('⏰ [Cron Job] Ejecutando Health Check diario (9:00 AM)...');
        try {
            const monitorNumber = process.env.MONITOR_WHATSAPP_NUMBER;
            if (monitorNumber) {
                const message = `✅ *CCDT Bot - Health Check*\n\nInformo que el sistema de WhatsApp está vinculado y funcionando correctamente.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR')}\n⏰ Hora: 09:00 AM\n\n_Seguimos en línea._ ⚡`;
                await WhatsAppService.sendMessage(monitorNumber, message, true); // skipMonitor para no ensuciar logs de monitoreo con el propio health check
                console.log('✅ [Cron Job] Health Check enviado a:', monitorNumber);
            }
        } catch (error) {
            console.error('❌ [Cron Job] Error en Health Check:', error);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Health Check diario a las 09:00 AM');
};

module.exports = initScheduledJobs;
