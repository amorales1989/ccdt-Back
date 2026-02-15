const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.isShuttingDown = false;
        this.authFolder = path.join(__dirname, '../../auth_info_baileys');

        // Asegurar que existe la carpeta de auth
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }
    }

    async initialize() {
        if (this.isShuttingDown) return;

        try {
            console.log('🔄 [WhatsApp] Inicializando servicio...');

            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

            this.sock = makeWASocket({
                auth: state,
                defaultQueryTimeoutMs: undefined,
            });

            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log('📱 [WhatsApp] Escanea este QR para iniciar sesión:');
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'close') {
                    if (this.isShuttingDown) {
                        console.log('❌ [WhatsApp] Conexión cerrada por apagado.');
                        return;
                    }

                    const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    console.log(`❌ [WhatsApp] Conexión cerrada (Status: ${statusCode}). Reconectando: ${shouldReconnect}`);

                    if (shouldReconnect) {
                        // En Render, si hay conflicto (440), esperamos 30s para que la otra instancia muera
                        const isConflict = statusCode === DisconnectReason.connectionReplaced;
                        const delay = isConflict ? 30000 : 5000;

                        if (isConflict) {
                            console.warn('⚠️ [WhatsApp] Conflicto de sesión (440). Esperando 30s...');
                        }

                        setTimeout(() => this.initialize(), delay);
                    } else {
                        console.log('🔒 [WhatsApp] Sesión cerrada definitivamente.');
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

    async logout() {
        this.isShuttingDown = true;
        if (this.sock) {
            console.log('📤 [WhatsApp] Cerrando conexión voluntariamente...');
            try {
                // logout() cierra la conexión y notifica al servidor de WA para liberar la sesión
                await this.sock.logout();
                this.sock = null;
                this.isConnected = false;
            } catch (err) {
                console.error('❌ [WhatsApp] Error durante logout:', err.message);
            }
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
