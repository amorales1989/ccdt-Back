const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const Sentry = require('@sentry/node');
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
     * Devuelve true solo si la carpeta tiene una sesión REALMENTE vinculada.
     * Baileys marca creds.registered=true (y completa creds.me) cuando el
     * dispositivo terminó de vincularse. Una carpeta a medio-vincular (se creó
     * pero nunca se escaneó el QR) NO debe reconectarse: generaría un loop 408.
     */
    esSesionVinculada(authFolder) {
        try {
            const credsPath = path.join(authFolder, 'creds.json');
            if (!fs.existsSync(credsPath)) return false;
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
            return creds?.registered === true || !!creds?.me?.id;
        } catch {
            return false;
        }
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
            if (!folder.startsWith('company_')) continue;
            const companyId = folder.replace('company_', '');
            const authFolder = path.join(authPath, folder);

            // Solo restaurar sesiones vinculadas de verdad. Carpetas sin vincular
            // (ej: una empresa de prueba que nunca escaneó el QR) se ignoran para
            // evitar reconexiones en loop con error 408.
            if (!this.esSesionVinculada(authFolder)) {
                console.log(`⏭️ [WhatsApp] Empresa ${companyId} sin sesión vinculada: se ignora (no se reconecta).`);
                continue;
            }

            console.log(`📡 [WhatsApp] Restaurando sesión para empresa: ${companyId}`);
            this.conectar(companyId).catch(err => {
                console.error(`❌ Error restaurando sesión ${companyId}:`, err.message);
            });
        }
    }

    async conectar(companyId) {
        // Guardia anti-"ghost": solo abrir sesión para una empresa REAL.
        // Un companyId basura (un teléfono, un id inexistente) crearía una carpeta
        // company_* que luego compite con la sesión real y la tira (error 408).
        const idNum = Number(companyId);
        if (!Number.isInteger(idNum) || idNum <= 0 || idNum > 2147483647) {
            console.warn(`⚠️ [WhatsApp] companyId inválido '${companyId}' (no es un id de empresa). No se crea sesión.`);
            return;
        }
        try {
            const { data: company, error } = await supabaseAdmin
                .from('companies')
                .select('id')
                .eq('id', idNum)
                .maybeSingle();
            // Si la empresa no existe, no abrimos sesión (evita ghosts). En error
            // transitorio de DB seguimos (fail-open) para no romper una sesión legítima.
            if (!error && !company) {
                console.warn(`⚠️ [WhatsApp] La empresa ${idNum} no existe. No se crea sesión de WhatsApp.`);
                return;
            }
        } catch (e) {
            console.error(`[WhatsApp] No se pudo validar companyId ${idNum}:`, e.message);
        }

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
                        // El dispositivo fue desvinculado (logout desde el teléfono o sesión expirada).
                        Sentry.captureMessage(
                            `WhatsApp desvinculado en empresa ${companyId} — requiere re-escanear QR`,
                            { level: 'error', tags: { service: 'whatsapp', event: 'logout', companyId: String(companyId) } }
                        );
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
            Sentry.captureException(error, { tags: { service: 'whatsapp', event: 'connect-error', companyId: String(companyId) } });
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
            // Reconectar solo si YA hay una sesión vinculada en disco. Nunca
            // iniciar un flujo de QR nuevo desde un envío automático (ej: el
            // scheduler iterando empresas sin WhatsApp vinculado): eso crearía
            // un socket en loop 408 para una empresa que no tiene sesión.
            const baseAuthDir = process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, '../../auth');
            const authFolder = path.join(baseAuthDir, `company_${companyId}`);
            if (this.esSesionVinculada(authFolder)) {
                await this.conectar(companyId);
                sock = this.sessions.get(companyId);
            }
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

    /**
     * Envía el mismo mensaje a múltiples destinatarios de forma secuencial,
     * con un delay aleatorio entre 15s y 30s entre cada envío para evitar bloqueos por spam.
     * @param {number} companyId
     * @param {Array<{phone: string, message?: string, name?: string}>} recipients - lista de destinatarios. Si message no se provee, usa el default.
     * @param {string} [defaultMessage] - mensaje a usar si el recipient no trae uno propio.
     * @returns {Promise<{sent: number, failed: number, errors: Array}>}
     */
    async sendBulkMessages(companyId, recipients, defaultMessage) {
        const results = { sent: 0, failed: 0, errors: [] };
        const list = (recipients || []).filter(r => r && r.phone && String(r.phone).trim() !== '');

        for (let i = 0; i < list.length; i++) {
            const r = list[i];
            const text = r.message || defaultMessage;
            try {
                await this.sendMessage(companyId, r.phone, text);
                results.sent++;
                console.log(`✅ [Bulk WA] ${i + 1}/${list.length} enviado a ${r.name || r.phone}`);
            } catch (err) {
                results.failed++;
                results.errors.push({ phone: r.phone, error: err.message });
                console.error(`❌ [Bulk WA] ${i + 1}/${list.length} falló a ${r.phone}: ${err.message}`);
            }

            // Delay aleatorio 15-30s entre mensajes (no después del último)
            if (i < list.length - 1) {
                const delayMs = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;
                console.log(`⏳ [Bulk WA] Esperando ${(delayMs / 1000).toFixed(1)}s antes del siguiente envío...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        return results;
    }

    getStatus(companyId) {
        const sock = this.sessions.get(companyId);
        return sock ? 'connected' : 'disconnected';
    }
}

module.exports = new WhatsAppService();
