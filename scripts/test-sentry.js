// Verifica que el DSN configurado (GlitchTip) recibe eventos.
// Uso, desde la raiz del repo:  node scripts/test-sentry.js
require('../instrument.js');
const Sentry = require('@sentry/node');

if (!process.env.SENTRY_DSN) {
  console.error('❌ No hay SENTRY_DSN en .env — el SDK esta deshabilitado y no manda nada.');
  process.exit(1);
}

console.log(`📡 DSN: ${process.env.SENTRY_DSN.replace(/\/\/([^@]+)@/, '//***@')}`);

const eventId = Sentry.captureException(
  new Error(`Evento de prueba desde ccdt-back — ${new Date().toISOString()}`)
);
console.log(`📤 Evento encolado: ${eventId}`);

Sentry.flush(5000).then((ok) => {
  if (ok) {
    console.log('✅ Enviado. Buscalo en el proyecto de GlitchTip (tarda unos segundos en aparecer:');
    console.log('   lo procesa el worker, no el web).');
  } else {
    console.error('❌ Timeout al enviar. Revisá que el DSN sea alcanzable desde este host.');
  }
  process.exit(ok ? 0 : 1);
});
