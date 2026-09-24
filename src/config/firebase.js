const admin = require('firebase-admin');

let serviceAccount;

// Verificar si estamos en producción (con variable de entorno)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Producción: usar variable de entorno con el JSON completo
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (process.env.FIREBASE_PRIVATE_KEY) {
  // Producción: usar variables individuales
  serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };
} else {
  // Desarrollo local: usar archivo (gitignoreado).
  // Si no está, NO se revienta en el require: este módulo lo importa
  // notificationService, del que cuelgan siete routers. Un throw acá los deja sin
  // montar y esas rutas responden 404 "Ruta no encontrada" en vez de decir que falta
  // una credencial — el fallback silencioso que la regla 5 del CLAUDE.md pide evitar.
  try {
    serviceAccount = require('../../config/serviceAccountKey.json');
  } catch (err) {
    serviceAccount = null;
  }
}

let messaging;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
  });
  messaging = admin.messaging();
} else {
  // Sin credenciales (ej. CI): la app levanta igual y las rutas se montan, pero cualquier
  // intento real de mandar un push falla con un mensaje explícito en vez de quedar mudo.
  console.warn('⚠️  Firebase sin credenciales: las notificaciones push quedan deshabilitadas.');

  const sinCredenciales = () => Promise.reject(
    new Error('Firebase no está configurado: falta FIREBASE_SERVICE_ACCOUNT, FIREBASE_PRIVATE_KEY o config/serviceAccountKey.json')
  );

  messaging = {
    send: sinCredenciales,
    sendEachForMulticast: sinCredenciales,
    subscribeToTopic: sinCredenciales,
    unsubscribeFromTopic: sinCredenciales,
  };
}

module.exports = { admin, messaging };