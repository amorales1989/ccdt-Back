// Inicialización del SDK de Sentry — debe importarse ANTES que cualquier otro módulo.
// El DSN apunta a GlitchTip self-hosted (ver deploy/glitchtip/), que habla la misma
// API. Por eso el SDK y todo el código que lo usa siguen igual: solo cambia el DSN.
// Carga las variables de entorno antes de leer SENTRY_DSN.
require('dotenv').config();
require('dotenv').config({ path: '.env.local', override: true });

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

const dsn = process.env.SENTRY_DSN;

// Muestreo de performance. Apagado por defecto (0): contra GlitchTip self-hosted
// cada transacción es una fila más en SU Postgres, y al 100% el disco del VPS se va
// en trazas que nadie mira. Prenderlo puntualmente por env (ej. 0.1) si hace falta.
const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : 0;

// Profiling: GlitchTip no lo soporta, así que queda en 0. La integración sigue
// cargada (es inofensiva con sample rate 0) por si algún día se vuelve a Sentry.
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
  console.warn('⚠️  SENTRY_DSN no configurado — el reporte de errores está deshabilitado.');
}
