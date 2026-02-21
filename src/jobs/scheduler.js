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
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ [Cron Job] Ejecutando Health Check diario (9:00 AM)...');
        try {
            const monitorNumber = process.env.MONITOR_WHATSAPP_NUMBER;
            if (!monitorNumber) return;

            // Intentar enviar con un pequeño reintento si no está conectado aún (el servicio puede estar reconectando)
            let sent = false;
            let attempts = 0;
            const maxAttempts = 3;

            while (!sent && attempts < maxAttempts) {
                sent = await WhatsAppService.sendMessage(monitorNumber,
                    `✅ *CCDT Bot - Health Check*\n\nInformo que el sistema de WhatsApp está vinculado y funcionando correctamente.\n\n📅 Fecha: ${new Date().toLocaleDateString('es-AR')}\n⏰ Hora Actual: ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n\n_Seguimos en línea._ ⚡`,
                    true
                );

                if (!sent) {
                    attempts++;
                    if (attempts < maxAttempts) {
                        console.log(`⚠️ [Cron Job] Health Check fallido (intento ${attempts}). Reintentando en 30s...`);
                        await new Promise(resolve => setTimeout(resolve, 30000));
                    }
                }
            }

            if (sent) {
                console.log('✅ [Cron Job] Health Check enviado exitosamente a:', monitorNumber);
            } else {
                console.error('❌ [Cron Job] Health Check fallido tras todos los intentos. El servicio parece estar desconectado.');
            }
        } catch (error) {
            console.error('❌ [Cron Job] Error crítico en Health Check:', error);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    console.log('📅 Tarea programada: Health Check diario a las 09:00 AM');
};

module.exports = initScheduledJobs;
