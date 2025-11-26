// test-fcm.js
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const messaging = admin.messaging();

// ============================================
// CONFIGURACIÓN DE PRUEBA
// ============================================

// OPCIÓN A: Token específico (cópialo del frontend o de tu BD)
const TOKEN_PRUEBA = 'dcTHGv4pHn4wgPNOb6lHQo:APA91bGamO1AJlM1sYfHDIYgpC2H-2FBrn3yDQx9zvipTQH9oJMJ34N0DTAkmHlLgXciEg49INcVJrniMKFtcirl00lRrixfIK9Te9_021PM7YooDvXvNks';
// OPCIÓN B: O múltiples tokens
const TOKENS_PRUEBA = [
  'token-1-aqui',
  'token-2-aqui',
];

// ============================================
// FUNCIONES DE PRUEBA
// ============================================

// 1. Enviar a un token específico
async function enviarAUnToken() {
  console.log('📤 Enviando notificación a un token...\n');
  
  const message = {
    token: TOKEN_PRUEBA,
    notification: {
      title: '🔥 Notificación de Prueba',
      body: 'Esta notificación viene directamente del backend'
    },
    data: {
      tipo: 'test',
      timestamp: Date.now().toString(),
      url: '/dashboard'
    },
    webpush: {
      fcmOptions: {
        link: 'http://localhost:3000/dashboard'
      },
      notification: {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        requireInteraction: true
      }
    }
  };

  try {
    const response = await messaging.send(message);
    console.log('✅ Notificación enviada exitosamente!');
    console.log('📝 ID del mensaje:', response);
    return response;
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    throw error;
  }
}

// 2. Enviar a múltiples tokens
async function enviarAMultiples() {
  console.log('📤 Enviando notificación a múltiples tokens...\n');
  
  const message = {
    tokens: TOKENS_PRUEBA,
    notification: {
      title: '🎉 Notificación Masiva',
      body: 'Esta notificación se envía a varios dispositivos'
    },
    data: {
      tipo: 'broadcast',
      prioridad: 'alta',
      timestamp: Date.now().toString()
    },
    webpush: {
      fcmOptions: {
        link: 'http://localhost:3000'
      }
    }
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log('✅ Notificaciones enviadas!');
    console.log(`   Exitosas: ${response.successCount}`);
    console.log(`   Fallidas: ${response.failureCount}`);
    
    if (response.failureCount > 0) {
      console.log('\n⚠️  Errores:');
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.log(`   Token ${idx}: ${resp.error?.message}`);
        }
      });
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// 3. Enviar a un tema
async function enviarATema(tema = 'test-tema') {
  console.log(`📤 Enviando notificación al tema: ${tema}\n`);
  
  const message = {
    topic: tema,
    notification: {
      title: '📢 Mensaje a Tema',
      body: `Todos los suscritos al tema "${tema}" verán esto`
    },
    data: {
      tipo: 'tema',
      tema: tema,
      timestamp: Date.now().toString()
    },
    webpush: {
      fcmOptions: {
        link: 'http://localhost:3000'
      }
    }
  };

  try {
    const response = await messaging.send(message);
    console.log('✅ Notificación enviada al tema!');
    console.log('📝 ID del mensaje:', response);
    return response;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// 4. Suscribir tokens a un tema
async function suscribirATema(tokens, tema) {
  console.log(`➕ Suscribiendo ${tokens.length} token(s) al tema: ${tema}\n`);
  
  try {
    const response = await messaging.subscribeToTopic(tokens, tema);
    console.log('✅ Suscripción completada!');
    console.log(`   Exitosas: ${response.successCount}`);
    console.log(`   Fallidas: ${response.failureCount}`);
    return response;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// 5. Notificación con datos personalizados
async function enviarConDatosPersonalizados() {
  console.log('📤 Enviando notificación con datos personalizados...\n');
  
  const message = {
    token: TOKEN_PRUEBA,
    notification: {
      title: '🎯 Pedido Nuevo',
      body: 'Mesa 5 - Total: $150.00'
    },
    data: {
      tipo: 'nuevo_pedido',
      pedidoId: '12345',
      mesaId: '5',
      total: '150.00',
      items: JSON.stringify([
        { nombre: 'Pizza', cantidad: 2 },
        { nombre: 'Coca Cola', cantidad: 1 }
      ]),
      timestamp: Date.now().toString()
    },
    webpush: {
      fcmOptions: {
        link: 'http://localhost:3000/pedidos/12345'
      },
      notification: {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        requireInteraction: true,
        vibrate: [200, 100, 200]
      }
    }
  };

  try {
    const response = await messaging.send(message);
    console.log('✅ Notificación con datos enviada!');
    console.log('📝 ID del mensaje:', response);
    return response;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// 6. Notificación silenciosa (solo data, sin notification)
async function enviarNotificacionSilenciosa() {
  console.log('📤 Enviando notificación silenciosa (solo datos)...\n');
  
  const message = {
    token: TOKEN_PRUEBA,
    data: {
      tipo: 'sincronizacion',
      accion: 'actualizar_inventario',
      timestamp: Date.now().toString()
    }
  };

  try {
    const response = await messaging.send(message);
    console.log('✅ Notificación silenciosa enviada!');
    console.log('📝 ID del mensaje:', response);
    return response;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// ============================================
// MENÚ INTERACTIVO
// ============================================

async function menu() {
  console.log('\n==============================================');
  console.log('🔔 TEST DE NOTIFICACIONES PUSH FCM');
  console.log('==============================================\n');
  
  console.log('Selecciona una opción:\n');
  console.log('1. Enviar a un token específico');
  console.log('2. Enviar a múltiples tokens');
  console.log('3. Enviar a un tema');
  console.log('4. Suscribir tokens a un tema');
  console.log('5. Enviar con datos personalizados');
  console.log('6. Enviar notificación silenciosa');
  console.log('7. Ejecutar TODAS las pruebas');
  console.log('0. Salir\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Opción: ', async (opcion) => {
    console.log('');
    
    try {
      switch (opcion) {
        case '1':
          await enviarAUnToken();
          break;
        case '2':
          await enviarAMultiples();
          break;
        case '3':
          readline.question('Nombre del tema (enter para "test-tema"): ', async (tema) => {
            await enviarATema(tema || 'test-tema');
            readline.close();
            process.exit(0);
          });
          return;
        case '4':
          readline.question('Nombre del tema: ', async (tema) => {
            await suscribirATema([TOKEN_PRUEBA], tema);
            readline.close();
            process.exit(0);
          });
          return;
        case '5':
          await enviarConDatosPersonalizados();
          break;
        case '6':
          await enviarNotificacionSilenciosa();
          break;
        case '7':
          console.log('🚀 Ejecutando todas las pruebas...\n');
          await enviarAUnToken();
          console.log('\n---\n');
          await enviarConDatosPersonalizados();
          console.log('\n---\n');
          await enviarNotificacionSilenciosa();
          break;
        case '0':
          console.log('👋 Saliendo...');
          readline.close();
          process.exit(0);
          return;
        default:
          console.log('❌ Opción inválida');
      }
    } catch (error) {
      console.error('❌ Error en la ejecución:', error);
    }
    
    readline.close();
    process.exit(0);
  });
}

// ============================================
// EJECUCIÓN
// ============================================

// Si se ejecuta directamente
if (require.main === module) {
  menu();
}

// Exportar funciones para usar programáticamente
module.exports = {
  enviarAUnToken,
  enviarAMultiples,
  enviarATema,
  suscribirATema,
  enviarConDatosPersonalizados,
  enviarNotificacionSilenciosa
};