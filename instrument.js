// Inicialización de Sentry — debe importarse ANTES que cualquier otro módulo.
// Carga las variables de entorno antes de leer SENTRY_DSN.
require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

const dsn = process.env.SENTRY_DSN;

// Muestreo de performance: 1.0 = 100% de las transacciones. Ajustable por env
// para no consumir cuota si el tráfico crece (ej. 0.2 = 20%).
const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : 1.0;

// Muestreo de profiling (detalle a nivel de función dentro de cada traza).
// Apagado por defecto (0) porque el continuous profiling requiere pay-as-you-go
// en el plan free de Sentry. Prenderlo puntualmente con la env (ej. 0.2).
const profileSessionSampleRate = process.env.SENTRY_PROFILES_SAMPLE_RATE
  ? Number(process.env.SENTRY_PROFILES_SAMPLE_RATE)
  : 0;

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV || 'development',
  // Si no hay DSN configurado, el SDK queda inactivo (no rompe nada).
  enabled: Boolean(dsn),
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Performance / tracing automático de los endpoints Express.
  tracesSampleRate,
  // Profiling: se evalúa una sola vez en init y se activa durante las trazas.
  profileSessionSampleRate,
  profileLifecycle: 'trace',
});

if (!dsn) {
  console.warn('⚠️  SENTRY_DSN no configurado — Sentry deshabilitado.');
}
