const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importar configuraciones y middleware
const { testConnection } = require('./src/config/supabase');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

// Importar rutas con manejo de errores
let eventsRoutes, studentsRoutes, departmentsRoutes, authorizationsRoutes, fcmRoutes;
try {
  eventsRoutes = require('./src/routes/eventsRoutes');
} catch (error) {
  console.error('❌ Error loading events routes:', error.message);
}

try {
  studentsRoutes = require('./src/routes/studentsRoutes');
} catch (error) {
  console.error('❌ Error loading students routes:', error.message);
}

try {
  departmentsRoutes = require('./src/routes/departmentsRoutes');
} catch (error) {
  console.error('❌ Error loading departments routes:', error.message);
}

try {
  authorizationsRoutes = require('./src/routes/authorizationsRoutes');
} catch (error) {
  console.error('❌ Error loading authorizations routes:', error.message);
}

try {
  fcmRoutes = require('./src/routes/fcmRoutes');
} catch (error) {
  console.error('❌ Error loading fcm routes:', error.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad (modificar helmet para CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Manejo manual de CORS - más control
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://ccdt.vercel.app',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
  ];
  
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
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
    message: 'CCDT Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      ...(eventsRoutes && { events: '/api/events' }),
      ...(studentsRoutes && { students: '/api/students' }),
      ...(departmentsRoutes && { departments: '/api/departments' }),
      ...(authorizationsRoutes && { authorizations: '/api/authorizations' }),
      ...(fcmRoutes && { fcm: '/api/tokens, /api/fcm/temas' })
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

// API Routes con verificación de tipo
if (eventsRoutes) {
  app.use('/api/events', eventsRoutes);
}

if (studentsRoutes) {
  app.use('/api/students', studentsRoutes);
}

if (departmentsRoutes) {
  app.use('/api/departments', departmentsRoutes);
}

if (authorizationsRoutes) {
  app.use('/api/authorizations', authorizationsRoutes);
}

if (fcmRoutes) {
  app.use('/api', fcmRoutes);
}

// Middleware de manejo de errores (debe ir al final)
app.use(notFound);
app.use(errorHandler);

// Función para inicializar el servidor
const startServer = async () => {
  try {
    console.log('🔄 Probando conexión con Supabase...');
    await testConnection();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('🚀 Servidor iniciado exitosamente');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Base de datos: Supabase`);
      console.log('─'.repeat(50));
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Inicializar servidor
startServer();