const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { supabaseAdmin } = require('../config/supabase');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.sessions = new Map();
        this.qrcodeLib = null;
        try {
            this.qrcodeLib = require('qrcode');
        } catch (err) {
            console.warn('⚠️ [WhatsApp] Librería "qrcode" no encontrada. El QR no se guardará en la base de datos.');
        }
    }

    async initialize() {
        console.log('🚀 [WhatsApp Service] Inicializando...');
        await this.restaurarSesiones();
    }

    /**
     * Escanea la carpeta de autenticación e inicializa las conexiones previas
     */
    async restaurarSesiones() {
        const authPath = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, '../../auth');
        if (!fs.existsSync(authPath)) {
            fs.mkdirSync(authPath, { recursive: true });
            return;
        }

        const folders = fs.readdirSync(authPath);
        for (const folder of folders) {
            if (folder.startsWith('company_')) {
                const companyId = folder.replace('company_', '');
                console.log(`📡 [WhatsApp] Restaurando sesión para empresa: ${companyId}`);
                this.conectar(companyId).catch(err => {
                    console.error(`❌ Error restaurando sesión ${companyId}:`, err.message);
                });
            }
        }
    }

    async conectar(companyId) {
        // Evitar duplicados: Si ya hay un socket activo o conectando, no hacer nada
        if (this.sessions.has(companyId)) {
            const existingSock = this.sessions.get(companyId);
            if (existingSock.ws?.readyState === 0 || existingSock.ws?.readyState === 1) {
                console.log(`[WhatsApp] Empresa ${companyId} ya tiene una conexión activa o en curso.`);
                return;
            }
            this.sessions.delete(companyId);
        }

        try {
            const baseAuthDir = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, '../../auth');
            const authFolder = path.join(baseAuthDir, `company_${companyId}`);
            const { state, saveCreds } = await useMultiFileAuthState(authFolder);
            const { version } = await fetchLatestBaileysVersion();

            const sock = makeWASocket({
                version,
                auth: state,
                logger: require('pino')({ level: 'error' }),
                browser: ["RUBI", "Chrome", "1.0.0"]
            });

            // Guardar inmediatamente el nuevo socket
            this.sessions.set(companyId, sock);

            sock.ev.on('creds.update', () => {
                // Solo guardar si este socket sigue siendo el "oficial"
                if (this.sessions.get(companyId) === sock) {
                    saveCreds();
                }
            });

            sock.ev.on('connection.update', async (update) => {
                // Verificar si es un socket huérfano
                if (this.sessions.get(companyId) !== sock) {
                    console.log(`⚠️ [WhatsApp] Ignorando evento de socket antiguo para ${companyId}`);
                    try { sock.ws.close(); } catch (e) { }
                    return;
                }

                const { connection, lastDisconnect, qr } = update;
                if (connection) console.log(`📡 [WhatsApp] Estado conexión ${companyId}: ${connection}`);

                if (qr) {
                    if (this.qrcodeLib) {
                        try {
                            const qrBase64 = await this.qrcodeLib.toDataURL(qr);
                            await this.updateCompanyStatus(companyId, 'qr', qrBase64);
                        } catch (err) {
                            await this.updateCompanyStatus(companyId, 'qr', qr);
                        }
                    } else {
                        await this.updateCompanyStatus(companyId, 'qr', qr);
                    }
                }

                if (connection === 'close') {
                    const statusCode = (lastDisconnect?.error)?.output?.statusCode;

                    // IMPORTANTE: Si fue reemplazado (440) o deslogueado (401), NO reconectar automáticamente
                    const wasReplaced = statusCode === DisconnectReason.replaced || statusCode === 440;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut &&
                        statusCode !== 401 &&
                        !wasReplaced;

                    console.log(`❌ [WhatsApp] Conexión cerrada (${statusCode}). Reconectando: ${shouldReconnect}`);

                    if (this.sessions.get(companyId) === sock) {
                        this.sessions.delete(companyId);
                    }

                    if (shouldReconnect) {
                        setTimeout(() => this.conectar(companyId), 5000);
                    } else if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                        await this.updateCompanyStatus(companyId, 'disconnected', null);
                        if (fs.existsSync(authFolder)) {
                            fs.rmSync(authFolder, { recursive: true, force: true });
                        }
                    } else if (wasReplaced) {
                        console.log(`ℹ️ [WhatsApp] Sesión de empresa ${companyId} desplazada por una conexión más reciente.`);
                    }
                } else if (connection === 'open') {
                    console.log(`✅ [WhatsApp] ¡SESIÓN INICIADA! Empresa ${companyId} conectada.`);
                    await this.updateCompanyStatus(companyId, 'connected', null);
                }
            });

        } catch (error) {
            console.error(`❌ [WhatsApp] Error conectando empresa ${companyId}:`, error);
            this.sessions.delete(companyId);
        }
    }

    async desconectar(companyId) {
        const sock = this.sessions.get(companyId);
        if (sock) {
            try {
                await sock.logout();
            } catch (e) { }
            this.sessions.delete(companyId);
        }

        const baseAuthDir = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, '../../auth');
        const authFolder = path.join(baseAuthDir, `company_${companyId}`);
        if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
        }

        await this.updateCompanyStatus(companyId, 'disconnected', null);
    }

    async shutdown() {
        console.log('📶 [WhatsApp] Cerrando todas las sesiones...');
        for (const [companyId, sock] of this.sessions) {
            try {
                // No desconectar (vincular), solo cerrar el websocket
                sock.ev.removeAllListeners();
                sock.ws.close();
            } catch (err) { }
        }
        this.sessions.clear();
    }

    async updateCompanyStatus(companyId, status, qr) {
        try {
            const { error } = await supabaseAdmin
                .from('companies')
                .update({
                    whatsapp_status: status,
                    whatsapp_qr: qr,
                    updated_at: new Date().toISOString()
                })
                .eq('id', companyId);

            if (error) throw error;
        } catch (err) {
            console.error(`❌ [WhatsApp] Error actualizando DB para empresa ${companyId}:`, err.message);
        }
    }

    async sendMessage(companyId, phoneNumber, message) {
        let sock = this.sessions.get(companyId);

        if (!sock) {
            // Intentar reconectar si no está en memoria pero debería estarlo
            await this.conectar(companyId);
            sock = this.sessions.get(companyId);
        }

        if (!sock) {
            throw new Error('WhatsApp no conectado para esta empresa.');
        }

        // Formateo de número (Lógica Argentina/General)
        let cleanNumber = phoneNumber.replace(/\D/g, '');

        if (cleanNumber.startsWith('54') && cleanNumber.length === 12 && cleanNumber[2] !== '9') {
            cleanNumber = '549' + cleanNumber.substring(2);
        } else if (cleanNumber.length === 10) {
            cleanNumber = '549' + cleanNumber;
        }

        const jid = `${cleanNumber}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        return { success: true };
    }

    getStatus(companyId) {
        const sock = this.sessions.get(companyId);
        return sock ? 'connected' : 'disconnected';
    }
}

module.exports = new WhatsAppService();
