const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { pushHeartbeat } = require('../../src/services/kumaService');

// Servidor que hace de Uptime Kuma: guarda las URLs que recibe.
const recibidas = [];
let base;
const kuma = http.createServer((req, res) => { recibidas.push(req.url); res.end('OK'); });

test.before(async () => {
    await new Promise(r => kuma.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${kuma.address().port}/api/push/token123`;
});

test.after(() => kuma.close());

test('pushHeartbeat: sin la env del job es no-op', async () => {
    delete process.env.KUMA_PUSH_CUMPLEANIOS;
    await pushHeartbeat('cumpleanios');
    assert.equal(recibidas.length, 0);
});

test('pushHeartbeat: latido OK', async () => {
    process.env.KUMA_PUSH_CUMPLEANIOS = base;
    await pushHeartbeat('cumpleanios');
    assert.equal(recibidas.at(-1), '/api/push/token123?status=up&msg=OK');
});

test('pushHeartbeat: los guiones del job son guiones bajos en la env, y el error va en msg', async () => {
    process.env.KUMA_PUSH_ASISTENCIA_NO_TOMADA = base;
    await pushHeartbeat('asistencia-no-tomada', { ok: false, msg: 'Error: boom & fallo' });
    assert.equal(recibidas.at(-1), '/api/push/token123?status=down&msg=Error%3A+boom+%26+fallo');
});

test('pushHeartbeat: si Kuma no responde, no tira (el job no debe caerse por el monitoreo)', async () => {
    process.env.KUMA_PUSH_AUSENCIAS = 'http://127.0.0.1:1/api/push/x';
    await assert.doesNotReject(pushHeartbeat('ausencias'));
});

// --- Estado de sesiones de WhatsApp que lee /api/health/whatsapp ---

// whatsappService valida las envs de Supabase al cargar; no hace red al importarse.
process.env.SUPABASE_URL ||= 'https://stub.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'stub';
process.env.SUPABASE_SERVICE_KEY ||= 'stub';

const authDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-auth-'));
process.env.WHATSAPP_AUTH_DIR = authDir;
const WhatsAppService = require('../../src/services/whatsappService');

test.after(() => fs.rmSync(authDir, { recursive: true, force: true }));

const vincular = (companyId, registered) => {
    const dir = path.join(authDir, `company_${companyId}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'creds.json'), JSON.stringify({ registered, me: registered ? { id: '549' } : undefined }));
};

test('getSessionsHealth: sin sesiones en disco está OK (no hay nada que pueda caerse)', () => {
    assert.deepEqual(WhatsAppService.getSessionsHealth(), { ok: true, sessions: [] });
});

test('getSessionsHealth: una carpeta sin vincular (nunca escaneó el QR) no cuenta como caída', () => {
    vincular(9, false);
    assert.deepEqual(WhatsAppService.getSessionsHealth(), { ok: true, sessions: [] });
});

test('getSessionsHealth: sesión vinculada sin socket abierto = caída', () => {
    vincular(1, true);
    assert.deepEqual(WhatsAppService.getSessionsHealth(), {
        ok: false,
        sessions: [{ companyId: 1, status: 'disconnected' }]
    });
});

test('getSessionsHealth: con el socket OPEN vuelve a OK', () => {
    WhatsAppService.sessions.set(1, { ws: { isOpen: true } });
    assert.deepEqual(WhatsAppService.getSessionsHealth(), {
        ok: true,
        sessions: [{ companyId: 1, status: 'connected' }]
    });
    WhatsAppService.sessions.delete(1);
});
