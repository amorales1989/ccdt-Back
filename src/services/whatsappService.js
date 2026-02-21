const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { supabaseAdmin } = require('../config/supabase');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.sock = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.isShuttingDown = false;
        this.authFolder = path.join(__dirname, '../../auth_info_baileys');
        this.instanceId = Math.random().toString(36).substring(7);
        this.conflictCount = 0;
        this.stableConnectionTimeout = null;
        this.STABLE_THRESHOLD = 300000; // 5 minutos para considerar conexión estable
        this.MAX_CONFLICTS_BEFORE_LONG_WAIT = 4;
        this.MAX_CONFLICTS_BEFORE_STOP = 6;

        // Asegurar que existe la carpeta de auth
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }
    }

    async initialize() {
        if (this.isShuttingDown || this.isConnecting) return;
        this.isConnecting = true;

        try {
            console.log(`🔄 [WhatsApp][${this.instanceId}] Inicializando servicio...`);

            // 1. Restaurar sesión desde la base de datos si existe
            await this.readFromDatabase();

            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

            // 2. Interceptar guardado de credenciales globales
            const originalSaveCreds = saveCreds;
            const patchedSaveCreds = async () => {
                if (this.isShuttingDown) {
                    // Evitamos escribir en el disco si la instancia se está apagando
                    // Esto previene errores de "Bad MAC" en la nueva instancia
                    console.log(`🛡️ [WhatsApp][${this.instanceId}] Bloqueando escritura de credenciales durante apagado (Protección de Integridad).`);
                    return;
                }
                await originalSaveCreds();
                try {
                    const credsPath = path.join(this.authFolder, 'creds.json');
                    if (fs.existsSync(credsPath)) {
                        const content = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
                        await this.saveToDatabase('creds.json', content);
                    }
                } catch (err) {
                    console.error('❌ Error sincronizando creds.json:', err.message);
                }
            };

            // 3. Interceptar guardado de llaves individuales (pre-keys, sessions, etc)
            const originalSet = state.keys.set;
            state.keys.set = async (data) => {
                await originalSet(data);
                if (this.isShuttingDown) return; // No sincronizar a DB si se está apagando
                try {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const fileId = `${category}-${id.replace(/\//g, '_')}.json`;
                            if (value) {
                                await this.saveToDatabase(fileId, value);
                            } else {
                                // Opcional: manejar borrados en DB si es necesario
                            }
                        }
                    }
                } catch (err) {
                    console.error('❌ Error sincronizando llaves a DB:', err.message);
                }
            };

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
                    this.isConnecting = false;
                    this.isConnected = false;

                    // Limpiar timeout de estabilidad si se cierra la conexión antes de tiempo
                    if (this.stableConnectionTimeout) {
                        clearTimeout(this.stableConnectionTimeout);
                        this.stableConnectionTimeout = null;
                    }

                    if (this.isShuttingDown) {
                        console.log(`❌ [WhatsApp][${this.instanceId}] Conexión cerrada por apagado.`);
                        return;
                    }

                    const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    console.log(`❌ [WhatsApp][${this.instanceId}] Conexión cerrada (Status: ${statusCode}). Reconectando: ${shouldReconnect}`);

                    if (shouldReconnect) {
                        const isConflict = statusCode === DisconnectReason.connectionReplaced;

                        const jitter = Math.floor(Math.random() * 8000);
                        let delay = 5000 + jitter;

                        if (isConflict) {
                            this.conflictCount++;

                            if (this.conflictCount >= this.MAX_CONFLICTS_BEFORE_STOP) {
                                console.error(`🚨 [WhatsApp][${this.instanceId}] Múltiples conflictos detectados (${this.conflictCount}). DETENIENDO REINTENTOS para evitar bloqueo.`);
                                return;
                            }

                            if (this.conflictCount >= this.MAX_CONFLICTS_BEFORE_LONG_WAIT) {
                                delay = 900000 + jitter; // 15 minutos de espera
                                console.warn(`🏳️ [WhatsApp][${this.instanceId}] Conflicto persistente (#${this.conflictCount}). Me rindo por ahora. Próximo intento en 15 min...`);
                            } else {
                                // Backoff agresivo: 90s, 180s, 360s... + jitter
                                // Aumentamos la base a 90s para asegurar que la instancia vieja muera en Render
                                delay = (Math.pow(2, this.conflictCount - 1) * 90000) + jitter;
                                console.warn(`⚠️ [WhatsApp][${this.instanceId}] Conflicto #${this.conflictCount}. Reintentando en ${Math.round(delay / 1000)}s...`);
                            }
                        } else {
                            // Si el error no es de conflicto, usamos backoff normal sin incrementar conflictCount
                            delay = 5000 + jitter;
                        }

                        setTimeout(() => {
                            if (!this.isShuttingDown) {
                                this.initialize();
                            } else {
                                console.log(`🛑 [WhatsApp][${this.instanceId}] Ignorando reintento programado por apagado.`);
                            }
                        }, delay);
                    } else {
                        console.log(`🔒 [WhatsApp][${this.instanceId}] Sesión cerrada definitivamente o desvinculada.`);
                    }
                } else if (connection === 'open') {
                    console.log(`✅ [WhatsApp][${this.instanceId}] Conexión establecida. Verificando estabilidad...`);
                    this.isConnected = true;
                    this.isConnecting = false;

                    // Estrategia de Estabilidad: Solo reseteamos el contador si la conexión dura > 5 min
                    if (this.stableConnectionTimeout) clearTimeout(this.stableConnectionTimeout);
                    this.stableConnectionTimeout = setTimeout(() => {
                        if (this.isConnected) {
                            console.log(`💎 [WhatsApp][${this.instanceId}] Conexión estable confirmada. Reseteando contadores.`);
                            this.conflictCount = 0;
                        }
                        this.stableConnectionTimeout = null;
                    }, this.STABLE_THRESHOLD);
                }
            });

            this.sock.ev.on('creds.update', (creds) => {
                if (!this.isShuttingDown) {
                    saveCreds(creds);
                } else {
                    // Evitamos escribir en el disco si la instancia se está apagando
                    // Esto previene errores de "Bad MAC" en la nueva instancia
                    console.log(`🛡️ [WhatsApp][${this.instanceId}] Bloqueando escritura de credenciales durante apagado (Protección de Integridad).`);
                }
            });

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
        // Feature Flag: Permitir WhatsApp
        if (process.env.PERMITE_WHATSAPP !== 'true') {
            console.log(`🚫 [WhatsApp] Envío bloqueado por feature flag (PERMITE_WHATSAPP=${process.env.PERMITE_WHATSAPP})`);
            return true; // Retornamos true para no disparar reintentos innecesarios
        }

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

    /**
     * Descarga todos los archivos de sesión desde Supabase al disco local
     */
    async readFromDatabase() {
        console.log(`📥 [WhatsApp][${this.instanceId}] Restaurando sesión desde Supabase...`);
        try {
            const { data, error } = await supabaseAdmin
                .from('whatsapp_sessions')
                .select('*');

            if (error) throw error;

            if (data && data.length > 0) {
                if (!fs.existsSync(this.authFolder)) {
                    fs.mkdirSync(this.authFolder, { recursive: true });
                }

                for (const item of data) {
                    const filePath = path.join(this.authFolder, item.file_id);
                    // Baileys espera que el contenido sea un JSON válido para sus archivos de estado
                    fs.writeFileSync(filePath, JSON.stringify(item.content));
                }
                console.log(`✅ [WhatsApp][${this.instanceId}] Restaurados ${data.length} archivos de sesión.`);
            } else {
                console.log(`ℹ️ [WhatsApp][${this.instanceId}] No se encontró sesión previa en la nube.`);
            }
        } catch (err) {
            console.error(`❌ [WhatsApp][${this.instanceId}] Error crítico al restaurar desde DB:`, err.message);
        }
    }

    /**
     * Sube un archivo de sesión a Supabase
     */
    async saveToDatabase(fileId, content) {
        if (this.isShuttingDown) return;
        try {
            const { error } = await supabaseAdmin
                .from('whatsapp_sessions')
                .upsert({
                    file_id: fileId,
                    content: content,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
        } catch (err) {
            console.error(`❌ [WhatsApp][${this.instanceId}] Error enviando ${fileId} a la nube:`, err.message);
        }
    }
}

module.exports = new WhatsAppService();
