const WhatsAppService = require('./src/services/whatsappService');
require('dotenv').config();

const testNumber = process.env.MONITOR_WHATSAPP_NUMBER;

async function runTest() {
    console.log('🧪 Iniciando segunda prueba de envío WhatsApp...');
    console.log(`📱 Número de monitoreo: ${testNumber}`);

    await WhatsAppService.initialize();

    // Esperar a que se establezca la conexión
    let attempts = 0;
    const checkConnection = setInterval(async () => {
        attempts++;
        if (WhatsAppService.isConnected) {
            clearInterval(checkConnection);
            console.log('✅ Conexión establecida.');

            const result = await WhatsAppService.sendMessage(testNumber, '✅ Segunda prueba de WhatsApp confirmada. La sesión persiste correctamente.');

            if (result) {
                console.log('🚀 Segundo mensaje enviado exitosamente!');
            } else {
                console.error('❌ Error al enviar el segundo mensaje.');
            }
            process.exit(0);
        } else if (attempts > 10) {
            clearInterval(checkConnection);
            console.error('❌ Tiempo de espera agotado. El servicio no se conectó.');
            process.exit(1);
        }
    }, 2000);
}

runTest();
