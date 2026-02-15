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
        this.instanceId = Math.random().toString(36).substring(7); // ID para identificar esta instancia en logs de Render
        this.conflictCount = 0;

        // Asegurar que existe la carpeta de auth
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }
    }

    async initialize() {
        if (this.isShuttingDown) return;

        try {
            console.log(`🔄 [WhatsApp][${this.instanceId}] Inicializando servicio...`);

            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

            this.sock = makeWASocket({
                auth: state,
                defaultQueryTimeoutMs: undefined,
                logger: require('pino')({ level: 'error' })
            });

            this.sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log(`📱 [WhatsApp][${this.instanceId}] Escanea este QR para iniciar sesión:`);
                    qrcode.generate(qr, { small: true });
                }

                if (connection === 'close') {
                    if (this.isShuttingDown) {
                        console.log(`❌ [WhatsApp][${this.instanceId}] Conexión cerrada por apagado.`);
                        return;
                    }

                    const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    console.log(`❌ [WhatsApp][${this.instanceId}] Conexión cerrada (Status: ${statusCode}). Reconectando: ${shouldReconnect}`);

                    if (shouldReconnect) {
                        const isConflict = statusCode === DisconnectReason.connectionReplaced;
                        let delay = 5000;

                        if (isConflict) {
                            this.conflictCount++;
                            // 60s primer conflicto, 120s si persiste
                            delay = this.conflictCount > 1 ? 120000 : 60000;
                            console.warn(`⚠️ [WhatsApp][${this.instanceId}] Conflicto (440) #${this.conflictCount}. Reintentando en ${delay / 1000}s...`);
                        } else {
                            this.conflictCount = 0;
                        }

                        setTimeout(() => this.initialize(), delay);
                    } else {
                        console.log(`🔒 [WhatsApp][${this.instanceId}] Sesión cerrada definitivamente.`);
                        this.isConnected = false;
                    }
                } else if (connection === 'open') {
                    console.log(`✅ [WhatsApp][${this.instanceId}] Conexión establecida exitosamente`);
                    this.isConnected = true;
                    this.conflictCount = 0;
                }
            });

            this.sock.ev.on('creds.update', saveCreds);

        } catch (error) {
            console.error(`❌ [WhatsApp][${this.instanceId}] Error al inicializar:`, error);
        }
    }

    async shutdown() {
        this.isShuttingDown = true;
        if (this.sock) {
            console.log(`📤 [WhatsApp][${this.instanceId}] Cerrando conexión de forma segura...`);
            try {
                this.sock.ws.close();
                this.sock = null;
                this.isConnected = false;
            } catch (err) {
                console.error(`❌ [WhatsApp][${this.instanceId}] Error durante shutdown:`, err.message);
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
