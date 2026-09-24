// Aislamiento multi-tenant: el back usa supabaseAdmin (service_role), que IGNORA RLS.
// Si un controller olvida el .eq('company_id', req.companyId), devuelve datos de otra
// congregación sin que nada lo frene. Es la vulnerabilidad #1 declarada en el CLAUDE.md.
//
// Todo lo de acá corre con el token del admin de la empresa A pidiendo recursos de la B.
require('../helpers/env');

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createFixture } = require('../helpers/fixture');
const { admin } = require('../helpers/db');
const { startApp } = require('../helpers/server');

let fx, srv, tokenA, secretosDeB;

before(async () => {
    fx = await createFixture();
    srv = await startApp();
    tokenA = fx.A.users.admin.token;
    // Marcas que solo existen en la empresa B: si aparecen en una respuesta de A, hubo fuga.
    secretosDeB = [
        fx.B.department.id,
        fx.B.company.name,
        'EmpresaB',
        ...fx.B.students.map((s) => s.id),
    ];
});

after(async () => {
    if (srv) await srv.close();
    if (fx) await fx.destroy();
});

// Un id que el propio pedido llevaba en la URL no cuenta como fuga: varios endpoints lo
// devuelven de vuelta como eco (ej. `department_id` en /departments/:id/stats).
const sinFugas = (res, ruta) => {
    const texto = JSON.stringify(res.body ?? null);
    const encontradas = secretosDeB.filter((s) => !ruta.includes(s) && texto.includes(s));
    assert.equal(
        encontradas.length, 0,
        `${ruta} devolvió datos de la empresa B (status ${res.status}): ${encontradas.join(', ')}`
    );
};

test('los listados solo traen datos de la empresa del token', async () => {
    const listados = [
        '/api/students',
        '/api/departments',
        '/api/small-groups',
        '/api/topic-records',
        '/api/accounting/transactions',
        '/api/attendance/coverage',
        '/api/events',
        '/api/students/stats',
        '/api/students/birthdays/upcoming',
    ];

    for (const ruta of listados) {
        const res = await srv.request(ruta, { token: tokenA });
        assert.ok(res.status < 500, `${ruta} respondió ${res.status}`);
        sinFugas(res, ruta);
    }
});

test('pedir un recurso de otra empresa por id no devuelve sus datos', async () => {
    const alumnoB = fx.B.students[0].id;
    const deptB = fx.B.department.id;

    const rutas = [
        `/api/students/${alumnoB}`,
        `/api/students/${alumnoB}/timeline`,
        `/api/departments/${deptB}`,
        `/api/departments/${deptB}/students`,
        `/api/departments/${deptB}/classes`,
        `/api/departments/${deptB}/stats`,
        `/api/departments/${deptB}/delete-impact`,
        `/api/observations/${alumnoB}`,
        `/api/authorizations/students/${alumnoB}`,
        `/api/authorizations/departments/${deptB}/students`,
        `/api/attendance/coverage?department_id=${deptB}`,
        `/api/attendance/matrix?start=2026-01-01&end=2026-01-31&department_id=${deptB}`,
    ];

    for (const ruta of rutas) {
        const res = await srv.request(ruta, { token: tokenA });
        assert.ok(res.status < 500, `${ruta} respondió ${res.status}`);
        sinFugas(res, ruta);
    }
});

test('no se puede editar un alumno de otra empresa', async () => {
    const alumnoB = fx.B.students[0];

    await srv.request(`/api/students/${alumnoB.id}`, {
        method: 'PUT',
        token: tokenA,
        body: { first_name: 'Hackeado' },
    });

    const { data } = await admin.from('students').select('first_name').eq('id', alumnoB.id).single();
    assert.equal(data.first_name, alumnoB.first_name, 'un token de A modificó un alumno de B');
});

test('no se puede dar de baja un alumno de otra empresa', async () => {
    const alumnoB = fx.B.students[1];

    await srv.request(`/api/students/${alumnoB.id}`, {
        method: 'DELETE',
        token: tokenA,
        body: { reason: 'test' },
    });

    const { data } = await admin.from('students').select('deleted_at').eq('id', alumnoB.id).single();
    assert.equal(data.deleted_at, null, 'un token de A dio de baja un alumno de B');
});

test('no se puede editar un departamento de otra empresa', async () => {
    const deptB = fx.B.department;

    await srv.request(`/api/departments/${deptB.id}`, {
        method: 'PUT',
        token: tokenA,
        body: { description: 'Hackeado' },
    });

    const { data } = await admin.from('departments').select('description').eq('id', deptB.id).single();
    assert.equal(data.description, deptB.description, 'un token de A modificó un departamento de B');
});

test('no se puede cargar una observación sobre un alumno de otra empresa', async () => {
    const alumnoB = fx.B.students[0];

    await srv.request('/api/observations', {
        method: 'POST',
        token: tokenA,
        body: { student_id: alumnoB.id, text: 'Observación cruzada', observation: 'Observación cruzada' },
    });

    const { data } = await admin.from('student_observations').select('id').eq('student_id', alumnoB.id);
    assert.equal((data || []).length, 0, 'un token de A dejó una observación sobre un alumno de B');
});
