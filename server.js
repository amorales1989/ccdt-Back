// IMPORTANTE: inicializa Sentry antes que cualquier otro módulo.
require('./instrument.js');
const Sentry = require('@sentry/node');

require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

// La app (rutas + middlewares) se arma en src/app.js. Acá solo el arranque: listen,
// cron, WhatsApp y apagado controlado.
const app = require('./src/app');
const { testConnection } = require('./src/config/supabase');

const PORT = process.env.PORT || 3001;
const FALLBACK_PORT = 3002;

// Función para inicializar el servidor
const startServer = async () => {
  try {
    console.log('🔄 Probando conexión con Supabase...');
    await testConnection();

    // Iniciar servidor, con fallback si el puerto está ocupado
    const server = app.listen(PORT, () => {
      console.log('🚀 Servidor iniciado exitosamente');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Base de datos: Supabase`);
      console.log('─'.repeat(50));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Puerto ${PORT} ocupado, intentando con ${FALLBACK_PORT}...`);
        app.listen(FALLBACK_PORT, () => {
          console.log('🚀 Servidor iniciado exitosamente');
          console.log(`📍 URL: http://localhost:${FALLBACK_PORT}`);
          console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
          console.log(`📊 Base de datos: Supabase`);
          console.log('─'.repeat(50));
        });
      } else {
        throw err;
      }
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', async (err) => {
  console.error('❌ Unhandled Promise Rejection:', err?.message);
  Sentry.captureException(err);
  await Sentry.flush(2000);
  process.exit(1);
});

process.on('uncaughtException', async (err) => {
  console.error('❌ Uncaught Exception:', err?.message);
  Sentry.captureException(err);
  await Sentry.flush(2000);
  process.exit(1);
});

// Inicializar Cron Jobs
const initScheduledJobs = require('./src/jobs/scheduler');
initScheduledJobs();

// Inicializar WhatsApp Service
const WhatsAppService = require('./src/services/whatsappService');
WhatsAppService.initialize();

// Inicializar servidor
startServer();

// --- Manejo de Apagado Controlado (Graceful Shutdown) ---
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Se recibió ${signal}. Cerrando servicios de forma segura...`);

  try {
    // Intentar cerrar la sesión de WhatsApp de forma segura sin desvincular el dispositivo
    const WhatsAppService = require('./src/services/whatsappService');
    await WhatsAppService.shutdown();
    console.log('✅ WhatsApp desconectado correctamente.');
  } catch (err) {
    console.error('⚠️ Error al cerrar WhatsApp:', err.message);
  }

  console.log('👋 Backend finalizado.');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
