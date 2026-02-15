const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.authFolder = path.join(__dirname, '../../auth_info_baileys');

        // Asegurar que existe la carpeta de auth
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }
    }

    async initialize() {
        try {
            console.log('🔄 [WhatsApp] Inicializando servicio...');

            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

            this.sock = makeWASocket({
                printQRInTerminal: true, // Esto imprimirá el QR automáticamente si no hay sesión
                auth: state,
                defaultQueryTimeoutMs: undefined, // Evitar timeouts en algunas queries
            });

            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log('📱 [WhatsApp] Escanea este QR para iniciar sesión:');
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log('❌ [WhatsApp] Conexión cerrada. Reconectando:', shouldReconnect);

                    if (shouldReconnect) {
                        this.initialize();
                    } else {
                        console.log('🔒 [WhatsApp] Desconectado. Borra la carpeta auth_info_baileys para escanear de nuevo.');
                        this.isConnected = false;
                    }
                } else if (connection === 'open') {
                    console.log('✅ [WhatsApp] Conexión establecida exitosamente');
                    this.isConnected = true;
                }
            });

            this.sock.ev.on('creds.update', saveCreds);

        } catch (error) {
            console.error('❌ [WhatsApp] Error al inicializar:', error);
        }
    }

    async sendMessage(phoneNumber, text, skipMonitor = false) {
        if (!this.isConnected || !this.sock) {
            if (!skipMonitor) {
                const MonitorService = require('./monitorService');
                await MonitorService.logWhatsApp(phoneNumber, 'failure', 'Servicio no conectado');
            }
            return false;
        }

        try {
            const cleanNumber = phoneNumber.replace(/\D/g, '');
            const jid = `${cleanNumber}@s.whatsapp.net`;

            await this.sock.sendMessage(jid, { text });

            if (!skipMonitor) {
                const MonitorService = require('./monitorService');
                await MonitorService.logWhatsApp(phoneNumber, 'success');
            }
            return true;
        } catch (error) {
            console.error(`[WhatsApp] Error a ${phoneNumber}:`, error.message);
            if (!skipMonitor) {
                const MonitorService = require('./monitorService');
                await MonitorService.logWhatsApp(phoneNumber, 'failure', error.message);
            }
            return false;
        }
    }
}

module.exports = new WhatsAppService();
