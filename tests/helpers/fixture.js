// Fixture de tests: dos empresas completas (A y B) para poder probar el aislamiento
// multi-tenant. Se crea y se destruye en cada corrida; no toca los datos del dev.
const crypto = require('node:crypto');
const { admin, anon } = require('./db');

const PASSWORD = 'TestCcdt1234!';
const NOMBRE_EMPRESA = /^TEST_[a-z0-9]+_(A|B)$/;

const chk = (res, que) => {
    if (res.error) throw new Error(`Fixture: no se pudo ${que}: ${res.error.message}`);
    return res.data;
};

const login = async (email) => {
    const { data, error } = await anon().auth.signInWithPassword({ email, password: PASSWORD });
    if (error) throw new Error(`Fixture: login fallido de ${email}: ${error.message}`);
    return data.session.access_token;
};

// Re-firma un token REAL cambiando el momento del login (`amr`). Es el único modo de probar
// las ramas que dependen de cuándo se inició sesión: timeout por inactividad y cierre global
// de sesiones. Un login recién hecho siempre es "fresco" y nunca las dispara.
// Se reusan los claims del token original (sobre todo `session_id`): GoTrue valida que la
// sesión exista, así que un token inventado de cero da "Auth session missing".
const tokenConLoginEn = (tokenReal, loginAtMs) => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const claims = JSON.parse(Buffer.from(tokenReal.split('.')[1], 'base64').toString());
    const ahora = Math.floor(Date.now() / 1000);
    const head = b64({ alg: 'HS256', typ: 'JWT' });
    const payload = b64({
        ...claims,
        iat: ahora,
        exp: ahora + 3600,
        amr: [{ method: 'password', timestamp: Math.floor(loginAtMs / 1000) }],
    });
    const firma = crypto.createHmac('sha256', process.env.JWT_SECRET)
        .update(`${head}.${payload}`).digest('base64url');
    return `${head}.${payload}.${firma}`;
};

const crearUsuario = async ({ runId, empresa, companyId = null, role, departamento, assignedClass, suspended = false }) => {
    const email = `ccdt-test-${runId}-${empresa}-${role}@example.com`.toLowerCase();
    const { data, error } = await admin.auth.admin.createUser({
        email, password: PASSWORD, email_confirm: true,
    });
    if (error) throw new Error(`Fixture: no se pudo crear el usuario ${email}: ${error.message}`);

    chk(await admin.from('profiles').insert({
        id: data.user.id,
        email,
        first_name: role,
        last_name: `Test${empresa}`,
        role,
        roles: [role],
        company_id: companyId,
        departments: departamento ? [departamento.name] : [],
        department_id: departamento ? departamento.id : null,
        assigned_class: assignedClass || null,
        suspended,
        last_active_at: new Date().toISOString(),
    }), `crear el perfil de ${email}`);

    return { id: data.user.id, email, role, token: await login(email) };
};

const crearEmpresa = async ({ runId, letra, departamento, clases }) => {
    const [company] = chk(await admin.from('companies').insert({
        name: `TEST_${runId}_${letra}`,
        congregation_name: `Congregación de prueba ${letra}`,
        is_active: true,
        plan: 'estandar',
        extra_member_packs: 0,
        due_date: '2099-12-31',
    }).select(), `crear la empresa ${letra}`);

    const [dept] = chk(await admin.from('departments').insert({
        name: departamento,
        description: `Departamento de prueba ${letra}`,
        classes: clases,
        activity_days: [0],
        company_id: company.id,
    }).select(), `crear el departamento de ${letra}`);

    const alumnos = chk(await admin.from('students').insert(
        [1, 2].map((n) => ({
            first_name: `Alumno${n}`,
            last_name: `Empresa${letra}`,
            gender: n % 2 ? 'masculino' : 'femenino',
            company_id: company.id,
            department_id: dept.id,
            department: dept.name,
            assigned_class: clases[0],
        }))
    ).select(), `crear los alumnos de ${letra}`);

    chk(await admin.from('student_departments').insert(
        alumnos.map((a) => ({
            student_id: a.id,
            department_id: dept.id,
            company_id: company.id,
            assigned_class: clases[0],
        }))
    ), `asignar los alumnos de ${letra} al departamento`);

    const usuarios = {};
    for (const role of ['admin', 'maestro']) {
        usuarios[role] = await crearUsuario({
            runId, empresa: letra, companyId: company.id, role,
            departamento: dept,
            assignedClass: role === 'maestro' ? clases[0] : null,
        });
    }

    return { companyId: company.id, company, department: dept, clases, students: alumnos, users: usuarios };
};

// Borra todo lo de una empresa de prueba, en orden de dependencias.
const destruirEmpresa = async (companyId) => {
    const perfiles = (await admin.from('profiles').select('id').eq('company_id', companyId)).data || [];
    await admin.from('attendance').delete().eq('company_id', companyId);
    await admin.from('student_departments').delete().eq('company_id', companyId);
    await admin.from('students').delete().eq('company_id', companyId);
    // Borrar el usuario de auth arrastra el profile (FK ON DELETE CASCADE).
    for (const p of perfiles) await admin.auth.admin.deleteUser(p.id).catch(() => {});
    await admin.from('profiles').delete().eq('company_id', companyId);
    await admin.from('departments').delete().eq('company_id', companyId);
    await admin.from('companies').delete().eq('id', companyId);
};

// Restos de corridas que se cayeron a la mitad.
const limpiarSobras = async () => {
    const { data } = await admin.from('companies').select('id, name').like('name', 'TEST%');
    for (const c of data || []) {
        if (NOMBRE_EMPRESA.test(c.name)) await destruirEmpresa(c.id);
    }
};

const createFixture = async () => {
    await limpiarSobras();
    const runId = crypto.randomBytes(4).toString('hex');

    const A = await crearEmpresa({ runId, letra: 'A', departamento: 'jovenes', clases: ['Clase A1', 'Clase A2'] });
    const B = await crearEmpresa({ runId, letra: 'B', departamento: 'ninos', clases: ['Clase B1'] });

    // Super admin: por encima de todas las empresas, sin company_id propio.
    const systemAdmin = await crearUsuario({ runId, empresa: 'sys', role: 'system_admin' });

    return {
        runId, A, B, systemAdmin, PASSWORD, login, tokenConLoginEn,
        destroy: async () => {
            await destruirEmpresa(A.companyId);
            await destruirEmpresa(B.companyId);
            await admin.auth.admin.deleteUser(systemAdmin.id).catch(() => {});
            await admin.from('profiles').delete().eq('id', systemAdmin.id);
        },
    };
};

module.exports = { createFixture, tokenConLoginEn, login, PASSWORD };
