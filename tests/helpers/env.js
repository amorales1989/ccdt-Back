// Carga el entorno de tests y se planta si no apunta a la Supabase LOCAL.
//
// Importa esto ANTES que cualquier módulo de src/: config/supabase.js crea los clientes
// leyendo process.env en el require. El .env normal del repo apunta a PRODUCCIÓN, así que
// sin este guard un test de integración escribiría sobre datos reales.
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

const url = process.env.SUPABASE_URL || '';
const esLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(url.replace(/\/$/, ''));

if (!esLocal) {
    throw new Error(
        `Los tests de integración solo corren contra la Supabase local.\n` +
        `SUPABASE_URL=${url || '(vacío)'}\n` +
        `Generá el archivo con: supabase status -o env (ver tests/README.md).`
    );
}

for (const v of ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET']) {
    if (!process.env[v]) throw new Error(`Falta ${v} en .env.test`);
}

module.exports = { SUPABASE_URL: url };
