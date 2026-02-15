const { createClient } = require('@supabase/supabase-js');

// Validar que las variables de entorno existan
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Crear cliente de Supabase (Anon)
const supabase = createClient(supabaseUrl, supabaseKey);

// Crear cliente de Supabase (Admin) para operaciones que ignoran RLS
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);

// Función para probar la conexión
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('events') // Corregido 'event' a 'events'
      .select('*')
      .limit(1);

    console.log('✅ Conexión con Supabase exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error conectando con Supabase:', error.message);
    return false;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection
};