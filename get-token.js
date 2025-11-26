// get-token.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function obtenerTokens() {
  console.log('🔍 Buscando tokens activos en Supabase...\n');
  
  const { data, error } = await supabase
    .from('usuarios_tokens_fcm')
    .select('*')
    .eq('activo', true)
    .order('fecha_registro', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error consultando Supabase:', error.message);
    console.log('\n💡 Verifica:');
    console.log('   1. Que SUPABASE_URL y SUPABASE_SERVICE_KEY estén en .env');
    console.log('   2. Que la tabla usuarios_tokens_fcm exista');
    console.log('   3. Que tengas acceso a la tabla');
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No hay tokens registrados en la base de datos');
    console.log('\n💡 Necesitas:');
    console.log('   1. Abrir tu aplicación React en el navegador');
    console.log('   2. Iniciar sesión');
    console.log('   3. Aceptar permisos de notificaciones');
    console.log('   4. Esperar que se registre el token');
    console.log('   5. Volver a ejecutar: node get-token.js');
    return;
  }

  console.log(`✅ Encontrados ${data.length} tokens activos:\n`);
  
  data.forEach((row, idx) => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Token #${idx + 1}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`👤 Usuario ID: ${row.usuario_id}`);
    console.log(`📱 Plataforma: ${row.plataforma}`);
    console.log(`🏢 Empresa ID: ${row.empresa_id || 'N/A'}`);
    console.log(`🏪 Local ID: ${row.id_local || 'N/A'}`);
    console.log(`📅 Registrado: ${new Date(row.fecha_registro).toLocaleString()}`);
    console.log(`🔑 Token: ${row.token.substring(0, 80)}...`);
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 TOKEN COMPLETO PARA COPIAR (Primer registro):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(data[0].token);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('✅ PRÓXIMOS PASOS:');
  console.log('1. Copia el token de arriba');
  console.log('2. Abre test-fcm.js');
  console.log('3. Reemplaza TOKEN_PRUEBA con el token copiado (línea 18)');
  console.log('4. Ejecuta: node test-fcm.js\n');
}

obtenerTokens().then(() => process.exit(0));