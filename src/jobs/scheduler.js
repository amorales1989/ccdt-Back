const cron = require('node-cron');
const BirthdayService = require('../services/birthdayService');

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
};

module.exports = initScheduledJobs;
