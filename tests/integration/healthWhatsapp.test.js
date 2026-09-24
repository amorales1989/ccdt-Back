const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Envs mínimas para montar la app sin servicios reales (no hay red en estos tests:
// /api/health/whatsapp lee memoria y disco, no toca Supabase).
process.env.SUPABASE_URL ||= 'https://stub.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'stub';
process.env.SUPABASE_SERVICE_KEY ||= 'stub';

const authDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-auth-int-'));
process.env.WHATSAPP_AUTH_DIR = authDir;

const app = require('../../src/app');
const WhatsAppService = require('../../src/services/whatsappService');

let url;
let server;

test.before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    url = `http://127.0.0.1:${server.address().port}/api/health/whatsapp`;
});

test.after(() => {
    server.close();
    fs.rmSync(authDir, { recursive: true, force: true });
});

test('GET /api/health/whatsapp: 200 cuando no hay sesiones caídas', async () => {
    const res = await fetch(url);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).status, 'OK');
});

test('GET /api/health/whatsapp: 503 con una sesión vinculada caída (lo que alerta Kuma)', async () => {
    const dir = path.join(authDir, 'company_1');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'creds.json'), JSON.stringify({ registered: true }));

    const res = await fetch(url);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.status, 'DEGRADED');
    assert.deepEqual(body.sessions, [{ companyId: 1, status: 'disconnected' }]);
});

test('GET /api/health/whatsapp: vuelve a 200 cuando la sesión reconecta', async () => {
    WhatsAppService.sessions.set(1, { ws: { isOpen: true } });
    const res = await fetch(url);
    assert.equal(res.status, 200);
    WhatsAppService.sessions.delete(1);
});
