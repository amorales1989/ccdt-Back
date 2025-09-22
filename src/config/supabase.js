const { createClient } = require('@supabase/supabase-js');

// Validar que las variables de entorno existan
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para probar la conexión
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('event')
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
  testConnection
};