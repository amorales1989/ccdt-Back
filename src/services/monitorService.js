class MonitorService {
    constructor() {
        this.fcmToken = process.env.MONITOR_FCM_TOKEN;
        this.whatsappNumber = process.env.MONITOR_WHATSAPP_NUMBER;
    }

    async log(action, status, detail = '', error = null) {
        if (action === 'MonitorAlert') return;

        const isSuccess = status === 'success';
        const emoji = isSuccess ? '✅' : '❌';
        const body = `${emoji} *${action.toUpperCase()}*\n*Estado:* ${status.toUpperCase()}\n*Detalle:* ${detail}${error ? `\n*Error:* ${error}` : ''}`;

        if (this.whatsappNumber) {
            try {
                const WhatsAppService = require('./whatsappService');
                await WhatsAppService.sendMessage(this.whatsappNumber, body, true);
            } catch (waErr) {
                console.error('[MonitorService] WhatsApp Log Error:', waErr.message);
            }
        }
    }

    // Helpers específicos
    async logWhatsApp(destinatario, status, error = null) {
        return this.log('WhatsApp', status, `Destinatario: ${destinatario}`, error);
    }

    async logEmail(destinatario, asunto, status, error = null) {
        return this.log('Email', status, `A: ${destinatario} | Asunto: ${asunto}`, error);
    }

    async logNotification(tipo, status, error = null) {
        return this.log('Push Notification', status, `Tipo: ${tipo}`, error);
    }
}

module.exports = new MonitorService();
