// El middleware de auth es la puerta de toda la API: seis caminos de rechazo distintos,
// cada uno con un `code` al que el front reacciona (ver apiCall en ccdt/src/lib/api.ts).
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

test('sin header Authorization devuelve 401', async () => {
    const res = await srv.request('/api/students');
    assert.equal(res.status, 401);
    assert.match(res.body.message, /token/i);
});

test('con un token inválido devuelve 401', async () => {
    const res = await srv.request('/api/students', { token: 'no-soy-un-jwt' });
    assert.equal(res.status, 401);
});

test('con un token válido deja pasar', async () => {
    const res = await srv.request('/api/heartbeat', { method: 'POST', token: fx.A.users.admin.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
});

test('el x-company-id del cliente no manda: la empresa sale del perfil', async () => {
    // Token de la empresa A diciendo ser de la B: tiene que devolver los alumnos de A.
    const res = await srv.request('/api/students', {
        token: fx.A.users.admin.token,
        companyId: fx.B.companyId,
    });

    assert.equal(res.status, 200);
    const apellidos = res.body.data.map((s) => s.last_name);
    assert.ok(apellidos.length > 0, 'la empresa A debería tener alumnos');
    assert.ok(apellidos.every((a) => a === 'EmpresaA'), `se filtraron alumnos de otra empresa: ${apellidos}`);
});

test('un usuario suspendido queda fuera de la app pero conserva el heartbeat', async () => {
    const maestro = fx.A.users.maestro;
    await admin.from('profiles').update({ suspended: true }).eq('id', maestro.id);

    try {
        const bloqueado = await srv.request('/api/students', { token: maestro.token });
        assert.equal(bloqueado.status, 403);
        assert.equal(bloqueado.body.code, 'USER_SUSPENDED');

        const permitido = await srv.request('/api/heartbeat', { method: 'POST', token: maestro.token });
        assert.equal(permitido.status, 200);
    } finally {
        await admin.from('profiles').update({ suspended: false }).eq('id', maestro.id);
    }
});

test('empresa deshabilitada: 403 COMPANY_INACTIVE salvo en suscripción', async () => {
    await admin.from('companies').update({ is_active: false }).eq('id', fx.B.companyId);

    try {
        const bloqueado = await srv.request('/api/students', { token: fx.B.users.admin.token });
        assert.equal(bloqueado.status, 403);
        assert.equal(bloqueado.body.code, 'COMPANY_INACTIVE');

        // El admin tiene que poder regularizar el pago aunque esté bloqueado.
        const suscripcion = await srv.request('/api/subscription', { token: fx.B.users.admin.token });
        assert.notEqual(suscripcion.body?.code, 'COMPANY_INACTIVE');
    } finally {
        await admin.from('companies').update({ is_active: true }).eq('id', fx.B.companyId);
    }
});

test('suscripción vencida bloquea igual que la empresa deshabilitada', async () => {
    await admin.from('companies').update({ due_date: '2020-01-01' }).eq('id', fx.B.companyId);

    try {
        const res = await srv.request('/api/students', { token: fx.B.users.admin.token });
        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'COMPANY_INACTIVE');
    } finally {
        await admin.from('companies').update({ due_date: '2099-12-31' }).eq('id', fx.B.companyId);
    }
});

test('un login fresco no dispara el timeout aunque last_active_at sea viejo', async () => {
    // Caso real: al volver a entrar, last_active_at todavía es el de la sesión anterior.
    const usuario = fx.A.users.admin;
    const hace3Horas = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    await admin.from('profiles').update({ last_active_at: hace3Horas }).eq('id', usuario.id);

    const tokenFresco = await fx.login(usuario.email);
    const res = await srv.request('/api/heartbeat', { method: 'POST', token: tokenFresco });

    assert.equal(res.status, 200);
});

test('más de 60 minutos sin actividad cierra la sesión', async () => {
    // Usa la maestra de B: el middleware hace signOut global, así que el token muere acá.
    const usuario = fx.B.users.maestro;
    const hace3Horas = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    await admin.from('profiles').update({ last_active_at: hace3Horas }).eq('id', usuario.id);

    const tokenViejo = fx.tokenConLoginEn(await fx.login(usuario.email), Date.now() - 3 * 60 * 60 * 1000);
    const res = await srv.request('/api/heartbeat', { method: 'POST', token: tokenViejo });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'INACTIVITY_TIMEOUT');
});

test('el cierre global de sesiones rechaza los logins anteriores al corte', async () => {
    const usuario = fx.B.users.admin;
    const hace1Hora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await admin.from('companies').update({ sessions_invalidated_at: hace1Hora }).eq('id', fx.B.companyId);

    try {
        // Login "de ayer": anterior al corte.
        const tokenViejo = fx.tokenConLoginEn(await fx.login(usuario.email), Date.now() - 24 * 60 * 60 * 1000);
        const res = await srv.request('/api/heartbeat', { method: 'POST', token: tokenViejo });

        assert.equal(res.status, 401);
        assert.equal(res.body.code, 'SESSION_REVOKED');
    } finally {
        await admin.from('companies').update({ sessions_invalidated_at: null }).eq('id', fx.B.companyId);
    }
});

test('un login posterior al corte sigue siendo válido', async () => {
    const usuario = fx.B.users.admin;
    const hace1Hora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await admin.from('companies').update({ sessions_invalidated_at: hace1Hora }).eq('id', fx.B.companyId);

    try {
        const tokenNuevo = await fx.login(usuario.email);
        const res = await srv.request('/api/heartbeat', { method: 'POST', token: tokenNuevo });
        assert.equal(res.status, 200);
    } finally {
        await admin.from('companies').update({ sessions_invalidated_at: null }).eq('id', fx.B.companyId);
    }
});
