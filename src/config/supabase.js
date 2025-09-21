const { createClient } = require('@supabase/supabase-js');

// Validar que las variables de entorno existan
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabaseUrl = 'https://wnmxgjrjrckwtyttidkw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndubXhnanJqcmNrd3R5dHRpZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxOTU3MzcsImV4cCI6MjA1Mzc3MTczN30.uhtHBW6t8t6ofL2GLvnBy5Gr44cbH-jfp-jKxaXi8Oo';

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