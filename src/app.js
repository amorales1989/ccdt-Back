// App de Express, sin `listen` ni servicios de fondo (cron, WhatsApp). El arranque real
// vive en server.js. Separado para que los tests puedan montar la app con
// `app.listen(0)` sin levantar Baileys ni el scheduler.
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const Sentry = require('@sentry/node');

const { testConnection } = require('./config/supabase');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/authMiddleware');

// Importar rutas con manejo de errores
let eventsRoutes, studentsRoutes, departmentsRoutes, authorizationsRoutes, fcmRoutes, whatsappRoutes, observationsRoutes, maintenanceRoutes, staffReportsRoutes;
try {
  eventsRoutes = require('./routes/eventsRoutes');
} catch (error) {
  console.error('❌ Error loading events routes:', error.message);
}

try {
  studentsRoutes = require('./routes/studentsRoutes');
} catch (error) {
  console.error('❌ Error loading students routes:', error.message);
}

try {
  departmentsRoutes = require('./routes/departmentsRoutes');
} catch (error) {
  console.error('❌ Error loading departments routes:', error.message);
}

try {
  authorizationsRoutes = require('./routes/authorizationsRoutes');
} catch (error) {
  console.error('❌ Error loading authorizations routes:', error.message);
}

try {
  fcmRoutes = require('./routes/fcmRoutes');
} catch (error) {
  console.error('❌ Error loading fcm routes:', error.message);
}

try {
  whatsappRoutes = require('./routes/whatsappRoutes');
} catch (error) {
  console.error('❌ Error loading whatsapp routes:', error.message);
}

try {
  observationsRoutes = require('./routes/observationsRoutes');
} catch (error) {
  console.error('❌ Error loading observations routes:', error.message);
}

let webhookRoutes, materialRoutes;
try {
  webhookRoutes = require('./routes/webhookRoutes');
} catch (error) {
  console.error('❌ Error loading webhook routes:', error.message);
}

try {
  materialRoutes = require('./routes/materialRoutes');
} catch (error) {
  console.error('❌ Error loading material routes:', error.message);
}

try {
  maintenanceRoutes = require('./routes/maintenanceRoutes');
} catch (error) {
  console.error('❌ Error loading maintenance routes:', error.message);
}

try {
  staffReportsRoutes = require('./routes/staffReportsRoutes');
} catch (error) {
  console.error('❌ Error loading staff reports routes:', error.message);
}

let toursRoutes;
try {
  toursRoutes = require('./routes/toursRoutes');
} catch (error) {
  console.error('❌ Error loading tours routes:', error.message);
}

let notificationsRoutes, profilesRoutes;
try {
  notificationsRoutes = require('./routes/notificationsRoutes');
} catch (error) {
  console.error('❌ Error loading notifications routes:', error.message);
}

try {
  profilesRoutes = require('./routes/profilesRoutes');
} catch (error) {
  console.error('❌ Error loading profiles routes:', error.message);
}

let attendanceRoutes;
try {
  attendanceRoutes = require('./routes/attendanceRoutes');
} catch (error) {
  console.error('❌ Error loading attendance routes:', error.message);
}

// Sin try/catch: si esta ruta no carga tiene que reventar acá y no responder 200 vacío.
const statsRoutes = require('./routes/statsRoutes');
const dailyVerseRoutes = require('./routes/dailyVerseRoutes');

let accountingRoutes;
try {
  accountingRoutes = require('./routes/accountingRoutes');
} catch (error) {
  console.error('❌ Error loading accounting routes:', error.message);
}

let topicRecordsRoutes;
try {
  topicRecordsRoutes = require('./routes/topicRecordsRoutes');
} catch (error) {
  console.error('❌ Error loading topic records routes:', error.message);
}

let systemAdminRoutes;
try {
  systemAdminRoutes = require('./routes/systemAdminRoutes');
} catch (error) {
  console.error('❌ Error loading system admin routes:', error.message);
}

let subscriptionRoutes;
try {
  subscriptionRoutes = require('./routes/subscriptionRoutes');
} catch (error) {
  console.error('❌ Error loading subscription routes:', error.message);
}

let companyRoutes;
try {
  companyRoutes = require('./routes/companyRoutes');
} catch (error) {
  console.error('❌ Error loading company routes:', error.message);
}

let smallGroupsRoutes;
try {
  smallGroupsRoutes = require('./routes/smallGroupsRoutes');
} catch (error) {
  console.error('❌ Error loading small groups routes:', error.message);
}

const app = express();

// Middleware de seguridad (modificar helmet para CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Manejo manual de CORS - más control
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // En desarrollo, ser más permisivos
  if (process.env.NODE_ENV !== 'production' || origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    const allowedOrigins = ['https://ccdt.vercel.app', 'https://n-xus.com', 'https://www.n-xus.com'];
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, x-company-id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Manejar preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Nexus Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      ...(eventsRoutes && { events: '/api/events' }),
      ...(studentsRoutes && { students: '/api/students' }),
      ...(departmentsRoutes && { departments: '/api/departments' }),
      ...(authorizationsRoutes && { authorizations: '/api/authorizations' }),
      ...(fcmRoutes && { fcm: '/api/tokens, /api/fcm/temas' }),
      ...(observationsRoutes && { observations: '/api/observations' })
    }
  });
});

app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();

  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: dbStatus ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

// API Routes con verificación de tipo y autenticación
if (eventsRoutes) {
  app.use('/api/events', authMiddleware, eventsRoutes);
}

if (studentsRoutes) {
  app.use('/api/students', authMiddleware, studentsRoutes);
}

if (departmentsRoutes) {
  app.use('/api/departments', authMiddleware, departmentsRoutes);
}

if (authorizationsRoutes) {
  app.use('/api/authorizations', authMiddleware, authorizationsRoutes);
}

// Webhooks (deben ir antes de las rutas protegidas para evitar interceptación)
if (webhookRoutes) {
  app.use('/api/webhooks', webhookRoutes);
}

if (whatsappRoutes) {
  app.use('/api/whatsapp', authMiddleware, whatsappRoutes);
}

if (observationsRoutes) {
  app.use('/api/observations', authMiddleware, observationsRoutes);
}

if (fcmRoutes) {
  app.use('/api', authMiddleware, fcmRoutes);
}

if (materialRoutes) {
  app.use('/api/material', authMiddleware, materialRoutes);
}

if (maintenanceRoutes) {
  app.use('/api/maintenance', authMiddleware, maintenanceRoutes);
}

if (staffReportsRoutes) {
  app.use('/api/staff-reports', authMiddleware, staffReportsRoutes);
}

if (toursRoutes) {
  app.use('/api/tours', authMiddleware, toursRoutes);
}

if (notificationsRoutes) {
  app.use('/api/notifications', authMiddleware, notificationsRoutes);
}

if (profilesRoutes) {
  app.use('/api/profiles', authMiddleware, profilesRoutes);
}

if (attendanceRoutes) {
  app.use('/api/attendance', authMiddleware, attendanceRoutes);
}

app.use('/api/stats', authMiddleware, statsRoutes);

app.use('/api/daily-verse', authMiddleware, dailyVerseRoutes);

if (accountingRoutes) {
  app.use('/api/accounting', authMiddleware, accountingRoutes);
}

if (topicRecordsRoutes) {
  app.use('/api/topic-records', authMiddleware, topicRecordsRoutes);
}

if (systemAdminRoutes) {
  app.use('/api/system', authMiddleware, systemAdminRoutes);
}

if (subscriptionRoutes) {
  app.use('/api/subscription', authMiddleware, subscriptionRoutes);
}

if (companyRoutes) {
  app.use('/api/company', authMiddleware, companyRoutes);
}

if (smallGroupsRoutes) {
  app.use('/api/small-groups', authMiddleware, smallGroupsRoutes);
}

// Heartbeat — solo actualiza last_active_at para mantener la sesión viva
app.post('/api/heartbeat', authMiddleware, (req, res) => {
  res.json({ success: true });
});

// Prueba del reporte de errores: tira un 500 real para verificar la cadena completa
// (Express -> next(error) -> SDK -> GlitchTip). Nunca en produccion.
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug-error', (req, res, next) => {
    next(new Error('Error de prueba desde /api/debug-error'));
  });
}

// Sentry: captura los errores que llegan a Express (antes de los handlers propios).
Sentry.setupExpressErrorHandler(app);

// Middleware de manejo de errores (debe ir al final)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
