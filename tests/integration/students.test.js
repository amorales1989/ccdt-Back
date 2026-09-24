// Alta de miembros: es el camino con más reglas de negocio del API (validación, DNI
// duplicado, ficha archivada y tope del plan) y el que más veces se toca.
require('../helpers/env');

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createFixture } = require('../helpers/fixture');
const { admin } = require('../helpers/db');
const { startApp } = require('../helpers/server');

let fx, srv, token;

before(async () => {
    fx = await createFixture();
    srv = await startApp();
    token = fx.A.users.admin.token;
});

after(async () => {
    if (srv) await srv.close();
    if (fx) await fx.destroy();
});

const crear = (body) => srv.request('/api/students', { method: 'POST', token, body });

test('sin nombre devuelve 400', async () => {
    const res = await crear({ last_name: 'SinNombre', gender: 'masculino' });
    assert.equal(res.status, 400);
});

test('el nombre en blanco tampoco alcanza', async () => {
    const res = await crear({ first_name: '   ', gender: 'masculino' });
    assert.equal(res.status, 400);
});

test('un alta válida queda en la empresa del token', async () => {
    const res = await crear({
        first_name: 'Nuevo',
        last_name: 'Miembro',
        gender: 'masculino',
        department_id: fx.A.department.id,
        assigned_class: fx.A.clases[0],
    });

    assert.ok(res.status < 400, `el alta falló con ${res.status}: ${res.text}`);

    const { data } = await admin.from('students').select('id, company_id, first_name')
        .eq('company_id', fx.A.companyId).eq('first_name', 'Nuevo');
    assert.equal(data.length, 1);
    assert.equal(data[0].company_id, fx.A.companyId);
});

// Pendiente de decisión: hoy la normalización vive solo en el front (normalizeStudentNames
// en ccdt/src/lib/api.ts). Cualquier cliente que pegue directo al API (la app móvil, curl)
// guarda el nombre tal cual lo mandó.
test('el nombre se normaliza igual que en el front', { todo: 'el back todavía no normaliza' }, async () => {
    await crear({ first_name: '  maría   josé ', last_name: 'del valle', gender: 'femenino' });

    const { data } = await admin.from('students').select('first_name, last_name')
        .eq('company_id', fx.A.companyId).ilike('last_name', '%valle%').maybeSingle();

    assert.ok(data, 'no se creó el miembro');
    assert.equal(data.first_name, 'María José');
    assert.equal(data.last_name, 'Del Valle');
});

test('un DNI ya registrado devuelve 409', async () => {
    const dni = '40111222';
    const alta = await crear({ first_name: 'Primero', last_name: 'ConDni', gender: 'masculino', document_number: dni });
    assert.ok(alta.status < 400, `el alta previa falló: ${alta.text}`);

    const repetido = await crear({ first_name: 'Segundo', last_name: 'ConDni', gender: 'masculino', document_number: dni });
    assert.equal(repetido.status, 409);
});

test('un DNI de una ficha archivada ofrece reactivarla en vez de duplicar', async () => {
    const dni = '40333444';
    await crear({ first_name: 'Exmiembro', last_name: 'Archivado', gender: 'masculino', document_number: dni });

    await admin.from('students')
        .update({ deleted_at: new Date().toISOString(), deleted_reason: 'se mudó' })
        .eq('company_id', fx.A.companyId).eq('document_number', dni);

    const res = await crear({ first_name: 'Exmiembro', last_name: 'Archivado', gender: 'masculino', document_number: dni });

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'ARCHIVED_DNI');
    assert.equal(res.body.archived_student.first_name, 'Exmiembro');
});

test('el mismo DNI puede repetirse entre empresas distintas', async () => {
    const dni = '40555666';
    await crear({ first_name: 'Homonimo', last_name: 'EnA', gender: 'masculino', document_number: dni });

    const enB = await srv.request('/api/students', {
        method: 'POST',
        token: fx.B.users.admin.token,
        body: { first_name: 'Homonimo', last_name: 'EnB', gender: 'masculino', document_number: dni },
    });

    assert.ok(enB.status < 400, `el DNI de otra congregación bloqueó el alta: ${enB.text}`);
});

test('al llegar al tope del plan corta el alta con MEMBER_LIMIT_REACHED', async () => {
    const LIMITE = 100; // plan inicial
    await admin.from('companies').update({ plan: 'inicial', extra_member_packs: 0 }).eq('id', fx.A.companyId);

    const { count } = await admin.from('students')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', fx.A.companyId).is('deleted_at', null);

    const relleno = Array.from({ length: LIMITE - count }, (_, n) => ({
        first_name: `Relleno${n}`,
        last_name: 'Tope',
        gender: 'masculino',
        company_id: fx.A.companyId,
    }));
    if (relleno.length) {
        const { error } = await admin.from('students').insert(relleno);
        assert.equal(error, null, `no se pudo llenar el padrón: ${error?.message}`);
    }

    try {
        const res = await crear({ first_name: 'UnoDeMas', last_name: 'Tope', gender: 'masculino' });
        assert.equal(res.status, 403);
        assert.equal(res.body.code, 'MEMBER_LIMIT_REACHED');
    } finally {
        await admin.from('students').delete().eq('company_id', fx.A.companyId).eq('last_name', 'Tope');
        await admin.from('companies').update({ plan: 'estandar' }).eq('id', fx.A.companyId);
    }
});

test('la búsqueda no cruza congregaciones', async () => {
    const res = await srv.request('/api/students/search?query=Alumno', { token });
    assert.ok(res.status < 400, `la búsqueda falló con ${res.status}`);

    const ajenos = JSON.stringify(res.body).includes('EmpresaB');
    assert.equal(ajenos, false, 'la búsqueda devolvió miembros de otra congregación');
});
