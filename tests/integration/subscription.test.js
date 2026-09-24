// Suscripción: acá se calcula lo que se le cobra a cada congregación. Las cuentas viven en
// subscriptionController (prorrateo, upgrade/downgrade, packs) y cualquier error se traduce
// en plata mal cobrada.
require('../helpers/env');

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createFixture } = require('../helpers/fixture');
const { admin } = require('../helpers/db');
const { startApp } = require('../helpers/server');

// Catálogo sintético: precios redondos para que las cuentas del test sean evidentes.
// La DB local arranca sin datos (el baseline es solo esquema).
const CATALOGO = [
    { value: 'inicial', label: 'Inicial', member_limit: 100, price_monthly: 10000, pack_price_monthly: 2000, sort: 1 },
    { value: 'estandar', label: 'Estándar', member_limit: 250, price_monthly: 20000, pack_price_monthly: 2000, sort: 2 },
    { value: 'avanzado', label: 'Avanzado', member_limit: 500, price_monthly: 30000, pack_price_monthly: 2000, sort: 3 },
    { value: 'premium', label: 'Premium', member_limit: 750, price_monthly: 40000, pack_price_monthly: 2000, sort: 4 },
    { value: 'corporativo', label: 'Corporativo', member_limit: null, price_monthly: 85000, pack_price_monthly: 2000, sort: 5 },
];

let fx, srv, token, catalogoPropio = false;

before(async () => {
    fx = await createFixture();
    srv = await startApp();
    token = fx.A.users.admin.token;

    const { count } = await admin.from('plans').select('value', { count: 'exact', head: true });
    if (!count) {
        const { error } = await admin.from('plans').insert(CATALOGO);
        assert.equal(error, null, `no se pudo sembrar el catálogo de planes: ${error?.message}`);
        catalogoPropio = true;
    }
});

after(async () => {
    if (srv) await srv.close();
    if (fx) await fx.destroy();
    if (catalogoPropio) await admin.from('plans').delete().in('value', CATALOGO.map((p) => p.value));
});

test('solo admin y secretaría ven la suscripción', async () => {
    const res = await srv.request('/api/subscription', { token: fx.A.users.maestro.token });
    assert.equal(res.status, 403);
});

test('la suscripción trae el plan, el padrón y el catálogo de la empresa del token', async () => {
    // OJO: el padrón no son solo los alumnos. El trigger `sync_profile_to_student` crea una
    // ficha de miembro para todo perfil con rol maestro o colaborador en cuanto se actualiza
    // (y authMiddleware actualiza `last_active_at` en CADA request). O sea: un maestro que
    // entra a la app pasa a contar contra el límite del plan.
    const { count: padron } = await admin.from('students')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', fx.A.companyId).is('deleted_at', null);

    const res = await srv.request('/api/subscription', { token });

    assert.equal(res.status, 200);
    assert.equal(res.body.plan, 'estandar');
    assert.equal(res.body.member_count, padron);
    assert.equal(res.body.plans.length, CATALOGO.length);
});

test('el padrón que informa es el de su congregación, no el total', async () => {
    const antes = (await srv.request('/api/subscription', { token })).body.member_count;

    // Ruido en la otra congregación: no tiene que moverle el número a esta.
    const { error } = await admin.from('students').insert([
        { first_name: 'Ruido1', last_name: 'EnB', gender: 'masculino', company_id: fx.B.companyId },
        { first_name: 'Ruido2', last_name: 'EnB', gender: 'femenino', company_id: fx.B.companyId },
    ]);
    assert.equal(error, null);

    try {
        const despues = (await srv.request('/api/subscription', { token })).body.member_count;
        assert.equal(despues, antes, 'el padrón de A se movió al agregar miembros en B');
    } finally {
        await admin.from('students').delete().eq('company_id', fx.B.companyId).eq('last_name', 'EnB');
    }
});

test('la cotización exige un type válido', async () => {
    assert.equal((await srv.request('/api/subscription/quote', { token })).status, 400);
    assert.equal((await srv.request('/api/subscription/quote?type=otra_cosa', { token })).status, 400);
});

test('subir de plan cobra la diferencia prorrateada', async () => {
    // due_date 2099 => factor de prorrateo 1: la cuenta queda a la vista.
    const res = await srv.request('/api/subscription/quote?type=plan&plan=avanzado', { token });

    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'charge');
    assert.equal(res.body.amount, 30000 - 20000);
});

test('bajar de plan no cobra: se agenda para la renovación', async () => {
    const res = await srv.request('/api/subscription/quote?type=plan&plan=inicial', { token });

    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'schedule');
    assert.equal(res.body.amount, 0);
});

test('no se puede bajar a un plan por debajo de los miembros actuales', async () => {
    const relleno = Array.from({ length: 120 }, (_, n) => ({
        first_name: `Padron${n}`, last_name: 'Downgrade', gender: 'masculino', company_id: fx.A.companyId,
    }));
    const { error } = await admin.from('students').insert(relleno);
    assert.equal(error, null, `no se pudo llenar el padrón: ${error?.message}`);

    try {
        const res = await srv.request('/api/subscription/quote?type=plan&plan=inicial', { token });
        assert.equal(res.status, 400);
        assert.match(res.body.message, /miembros actuales/i);
    } finally {
        await admin.from('students').delete().eq('company_id', fx.A.companyId).eq('last_name', 'Downgrade');
    }
});

test('cotizar el mismo plan que ya tiene es un 400', async () => {
    const res = await srv.request('/api/subscription/quote?type=plan&plan=estandar', { token });
    assert.equal(res.status, 400);
});

test('sumar packs cobra el precio del pack por la cantidad', async () => {
    const res = await srv.request('/api/subscription/quote?type=packs&delta=2', { token });

    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'charge');
    assert.equal(res.body.amount, 2000 * 2);
});

test('un delta de packs inválido no pasa', async () => {
    assert.equal((await srv.request('/api/subscription/quote?type=packs&delta=0', { token })).status, 400);
    assert.equal((await srv.request('/api/subscription/quote?type=packs&delta=1.5', { token })).status, 400);
    assert.equal((await srv.request('/api/subscription/quote?type=packs', { token })).status, 400);
});
