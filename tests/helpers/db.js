require('./env');
const { createClient } = require('@supabase/supabase-js');

const opciones = { auth: { autoRefreshToken: false, persistSession: false } };

// Service key: ignora RLS, es con lo que el back arma y limpia los datos de prueba.
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, opciones);

// Cliente anónimo nuevo por llamada: cada login de test tiene que ser independiente.
const anon = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, opciones);

module.exports = { admin, anon };
