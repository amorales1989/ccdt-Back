#!/usr/bin/env node
/**
 * Da de alta en Uptime Kuma los monitores del back: HTTP (API, WhatsApp, front,
 * GlitchTip) y un monitor Push por cada cron job de src/jobs/scheduler.js.
 *
 * Es idempotente: si el monitor ya existe (por nombre), lo saltea.
 *
 * Uso:
 *   KUMA_USER=admin KUMA_PASS='...' node deploy/uptime-kuma/setup-monitors.js
 *
 * Envs:
 *   KUMA_URL   base del panel de Kuma (está en Coolify › Uptime Kuma › Links)
 *   KUMA_USER / KUMA_PASS   credenciales del panel (nunca se escriben a disco)
 *   KUMA_2FA   token TOTP, solo si la cuenta tiene 2FA
 *   FRONT_URL  URL del front a monitorear (default: https://ccdt.vercel.app)
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID   si están, crea la notificación de
 *                                           Telegram y la engancha a todo
 *
 * Kuma no tiene API REST para esto: el panel habla socket.io. Acá va el mínimo
 * del protocolo (Engine.IO v4 sobre long-polling) para no sumar dependencias.
 */
require('dotenv').config();
const crypto = require('crypto');

// Sin default hardcodeado: este repo es público y la URL del panel lleva la IP del VPS.
const KUMA_URL = (process.env.KUMA_URL || '').replace(/\/$/, '');
const FRONT_URL = process.env.FRONT_URL || 'https://ccdt.vercel.app';
const API_URL = process.env.API_URL || 'https://api.n-xus.com';
const GLITCHTIP_URL = process.env.GLITCHTIP_URL || 'https://errores.n-xus.com';

const SEP = '\x1e'; // separador de paquetes de Engine.IO v4

class KumaClient {
    constructor(base) {
        this.base = base;
        this.ackId = 0;
        this.pending = new Map();   // ackId -> resolve
        this.events = new Map();    // nombre -> último payload recibido
        this.closed = false;
    }

    async connect() {
        const res = await fetch(`${this.base}/socket.io/?EIO=4&transport=polling`);
        if (!res.ok) throw new Error(`Kuma no respondió el handshake (HTTP ${res.status})`);
        this.sid = JSON.parse((await res.text()).slice(1)).sid;
        await this.post('40'); // conectar al namespace por defecto
        this.loop();           // long-polling en background
    }

    get qs() {
        return `${this.base}/socket.io/?EIO=4&transport=polling&sid=${this.sid}`;
    }

    async post(body) {
        await fetch(this.qs, { method: 'POST', body });
    }

    async loop() {
        while (!this.closed) {
            let text;
            try {
                text = await (await fetch(this.qs)).text();
            } catch {
                if (!this.closed) continue;
                return;
            }
            for (const packet of text.split(SEP)) {
                if (packet === '2') { this.post('3').catch(() => {}); continue; } // ping -> pong
                if (packet.startsWith('42')) {
                    const [name, payload] = JSON.parse(packet.slice(2));
                    this.events.set(name, payload);
                } else if (packet.startsWith('43')) {
                    const m = packet.match(/^43(\d+)(\[.*\])$/s);
                    if (!m) continue;
                    const resolve = this.pending.get(Number(m[1]));
                    if (resolve) { this.pending.delete(Number(m[1])); resolve(JSON.parse(m[2])[0]); }
                }
            }
        }
    }

    emit(name, ...args) {
        const id = this.ackId++;
        const done = new Promise((resolve, reject) => {
            this.pending.set(id, resolve);
            setTimeout(() => this.pending.has(id) && reject(new Error(`Timeout esperando respuesta de "${name}"`)), 20000);
        });
        this.post(`42${id}${JSON.stringify([name, ...args])}`);
        return done;
    }

    /** Espera un evento que el server empuja solo (monitorList, notificationList). */
    async waitEvent(name, timeoutMs = 10000) {
        const hasta = Date.now() + timeoutMs;
        while (Date.now() < hasta) {
            if (this.events.has(name)) return this.events.get(name);
            await new Promise(r => setTimeout(r, 100));
        }
        return null;
    }

    close() { this.closed = true; }
}

// Monitores HTTP. Intervalo 60s y 2 reintentos: un deploy de Coolify no debe alertar.
const httpMonitors = [
    {
        name: 'API Nexus',
        type: 'keyword',
        url: `${API_URL}/api/health`,
        // /api/health responde 200 aunque Supabase esté caído: lo que cambia es este texto.
        keyword: 'Connected',
    },
    { name: 'WhatsApp (Baileys)', type: 'http', url: `${API_URL}/api/health/whatsapp` },
    { name: 'Front Nexus', type: 'http', url: FRONT_URL },
    { name: 'GlitchTip', type: 'http', url: GLITCHTIP_URL },
];

// Un push por cron job. 90000s (25 h) porque son diarios: con el default de 60s
// Kuma los daría por caídos al minuto del primer latido.
const HEARTBEAT_INTERVAL = 90000;
const pushMonitors = [
    { job: 'cumpleanios', name: 'Cron · Cumpleaños (08:20)' },
    { job: 'asistencia-no-tomada', name: 'Cron · Asistencia sin tomar (08:35)' },
    { job: 'ausencias', name: 'Cron · Ausencias (08:40)' },
    { job: 'reporte-matutino', name: 'Cron · Reporte matutino (09:00)' },
    { job: 'solicitudes-pendientes', name: 'Cron · Solicitudes pendientes (09:00)' },
    { job: 'vencimiento-suscripcion', name: 'Cron · Vencimiento suscripción (10:00)' },
    { job: 'reporte-nocturno', name: 'Cron · Reporte nocturno (21:00)' },
    { job: 'cierre-sesiones', name: 'Cron · Cierre de sesiones (00:00)' },
];

// Token del push: alfanumérico corto, igual que el que genera Kuma (columna chica).
const pushToken = () => crypto.randomBytes(16).toString('base64url').slice(0, 10);

const baseMonitor = (notificationIDList) => ({
    notificationIDList,
    conditions: [],
    // El handler "add" de Kuma hace accepted_statuscodes.every(...) sin chequear que
    // exista, así que va también en los push aunque ahí no signifique nada.
    accepted_statuscodes: ['200-299'],
    upsideDown: false,
    resendInterval: 0,
    parent: null,
    description: null,
});

const httpDefaults = {
    method: 'GET',
    interval: 60,
    retryInterval: 60,
    maxretries: 2,
    timeout: 30,
    resendInterval: 10, // re-avisa cada ~10 min mientras siga caído
    maxredirects: 10,
    ignoreTls: false,
    expiryNotification: false,
    httpBodyEncoding: 'json',
    invertKeyword: false,
};

async function main() {
    const { KUMA_USER, KUMA_PASS, KUMA_2FA } = process.env;
    if (!KUMA_URL || !KUMA_USER || !KUMA_PASS) {
        console.error('Faltan KUMA_URL / KUMA_USER / KUMA_PASS.\nUso: KUMA_URL=... KUMA_USER=... KUMA_PASS=... node deploy/uptime-kuma/setup-monitors.js');
        process.exit(1);
    }

    const kuma = new KumaClient(KUMA_URL);
    console.log(`🔌 Conectando a ${KUMA_URL}...`);
    await kuma.connect();

    const login = await kuma.emit('login', { username: KUMA_USER, password: KUMA_PASS, token: KUMA_2FA || '' });
    if (!login?.ok) {
        console.error(`❌ Login rechazado: ${login?.msg || 'sin detalle'}`);
        kuma.close();
        process.exit(1);
    }
    console.log('✅ Login OK');

    // --- Notificación de Telegram (reusa el bot del back) ---
    const notificationIDList = {};
    const notifs = (await kuma.waitEvent('notificationList')) || [];
    const yaExiste = notifs.find(n => n.name === 'Telegram (Nexus)');

    if (yaExiste) {
        notificationIDList[yaExiste.id] = true;
        console.log('↷ Notificación "Telegram (Nexus)" ya existe');
    } else if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
        const res = await kuma.emit('addNotification', {
            name: 'Telegram (Nexus)',
            type: 'telegram',
            isDefault: true,
            applyExisting: true,
            telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
            telegramChatID: process.env.TELEGRAM_CHAT_ID,
            telegramServerUrl: 'https://api.telegram.org',
            telegramSendSilently: false,
            telegramProtectContent: false,
        }, null);
        if (res?.ok) {
            notificationIDList[res.id] = true;
            console.log('✅ Notificación de Telegram creada');
        } else {
            console.warn(`⚠️  No se pudo crear la notificación: ${res?.msg}`);
        }
    } else {
        console.warn('⚠️  Sin TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID: los monitores quedan sin notificación.');
    }

    // --- Monitores ---
    // Sin la lista no se puede saltear lo ya creado y correr dos veces dejaría
    // monitores duplicados (Kuma permite nombres repetidos): mejor abortar.
    const monitorList = await kuma.waitEvent('monitorList');
    if (!monitorList && !process.env.FORCE) {
        console.error('❌ Kuma no envió la lista de monitores. Repetir, o FORCE=1 para crear igual (puede duplicar).');
        kuma.close();
        process.exit(1);
    }
    const existentes = new Set(Object.values(monitorList || {}).map(m => m.name));
    const envs = [];
    let creados = 0;

    for (const m of httpMonitors) {
        if (existentes.has(m.name)) { console.log(`↷ ${m.name} ya existe`); continue; }
        const res = await kuma.emit('add', { ...baseMonitor(notificationIDList), ...httpDefaults, ...m });
        console.log(res?.ok ? `✅ ${m.name}` : `❌ ${m.name}: ${res?.msg}`);
        if (res?.ok) creados++;
    }

    for (const m of pushMonitors) {
        if (existentes.has(m.name)) { console.log(`↷ ${m.name} ya existe (su push URL está en el panel)`); continue; }
        const token = pushToken();
        const res = await kuma.emit('add', {
            ...baseMonitor(notificationIDList),
            type: 'push',
            name: m.name,
            pushToken: token,
            interval: HEARTBEAT_INTERVAL,
            retryInterval: HEARTBEAT_INTERVAL,
            maxretries: 0,
        });
        console.log(res?.ok ? `✅ ${m.name}` : `❌ ${m.name}: ${res?.msg}`);
        if (res?.ok) {
            creados++;
            envs.push(`KUMA_PUSH_${m.job.toUpperCase().replace(/-/g, '_')}=${KUMA_URL}/api/push/${token}`);
        }
    }

    if (envs.length) {
        console.log(`\n📋 Pegar estas envs en Coolify (servicio del back) y redeploy:\n`);
        console.log(envs.join('\n'));
    }
    console.log(`\nListo: ${creados} monitor(es) creados.`);

    kuma.close();
    process.exit(0);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
