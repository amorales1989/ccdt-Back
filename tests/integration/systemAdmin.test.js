// El panel de super admin es legítimamente cross-tenant: usa supabaseAdmin y NO filtra por
// company_id. Lo único que lo sostiene es el `ensureSystemAdmin` de cada handler, uno por uno.
// Si alguno se olvida, un admin de congregación pasa a manejar todas las empresas del sistema.
require('../helpers/env');

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createFixture } = require('../helpers/fixture');
const { admin } = require('../helpers/db');
const { startApp } = require('../helpers/server');

let fx, srv;

before(async () => {
    fx = await createFixture();
    srv = await startApp();
});

after(async () => {
    if (srv) await srv.close();
    if (fx) await fx.destroy();
});

// Todos los endpoints de /api/system. Al sumar uno nuevo a systemAdminRoutes.js va acá.
const endpoints = (companyId, userId) => [
    ['GET', '/companies'],
    ['POST', '/companies', { name: 'Intrusa' }],
    ['PUT', `/companies/${companyId}`, { name: 'Renombrada' }],
    ['DELETE', `/companies/${companyId}`],
    ['PATCH', `/companies/${companyId}/status`, { is_active: false }],
    ['PATCH', `/companies/${companyId}/plan`, { plan: 'corporativo' }],
    ['PATCH', `/companies/${companyId}/packs`, { extra_member_packs: 99 }],
    ['POST', `/companies/${companyId}/payments`, { amount: 1, billing_cycle: 'mensual' }],
    ['GET', `/companies/${companyId}/payments`],
    ['POST', `/companies/${companyId}/free-months`, { months: 12 }],
    ['GET', '/badges'],
    ['POST', `/companies/${companyId}/badges`, { badge_id: 1 }],
    ['DELETE', `/companies/${companyId}/badges/1`],
    ['GET', '/plans'],
    ['PUT', '/plans/inicial', { price_monthly: 1 }],
    ['GET', `/companies/${companyId}/admins`],
    ['POST', `/companies/${companyId}/admin`, { email: 'intruso@example.com', password: 'Intruso1234!' }],
    ['PATCH', `/admins/${userId}/password`, { password: 'Intruso1234!' }],
];

test('ningún endpoint de /api/system acepta a un admin de congregación', async () => {
    const rutas = endpoints(fx.B.companyId, fx.B.users.admin.id);

    for (const [method, ruta, body] of rutas) {
        const res = await srv.request(`/api/system${ruta}`, {
            method, body, token: fx.A.users.admin.token,
        });
        assert.equal(res.status, 403, `${method} /api/system${ruta} respondió ${res.status} en vez de 403`);
    }
});

test('tampoco lo acepta con otros roles de la congregación', async () => {
    for (const [method, ruta, body] of endpoints(fx.B.companyId, fx.B.users.admin.id)) {
        const res = await srv.request(`/api/system${ruta}`, {
            method, body, token: fx.A.users.maestro.token,
        });
        assert.equal(res.status, 403, `${method} /api/system${ruta} respondió ${res.status} para un maestro`);
    }
});

test('la empresa B sobrevivió intacta al barrido de intentos', async () => {
    const { data } = await admin.from('companies')
        .select('id, name, is_active, plan, extra_member_packs')
        .eq('id', fx.B.companyId).single();

    assert.equal(data.name, fx.B.company.name);
    assert.equal(data.is_active, true);
    assert.equal(data.plan, 'estandar');
    assert.equal(data.extra_member_packs, 0);
});

test('el system_admin sí entra y ve todas las congregaciones', async () => {
    const res = await srv.request('/api/system/companies', { token: fx.systemAdmin.token });

    assert.equal(res.status, 200);
    const nombres = res.body.data.map((c) => c.name);
    assert.ok(nombres.includes(fx.A.company.name), 'no listó la empresa A');
    assert.ok(nombres.includes(fx.B.company.name), 'no listó la empresa B');
});

test('el system_admin no necesita mandar x-company-id', async () => {
    const res = await srv.request('/api/system/companies', { token: fx.systemAdmin.token, companyId: 999 });
    assert.equal(res.status, 200);
});
