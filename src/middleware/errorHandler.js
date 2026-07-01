// Middleware para manejo centralizado de errores
const errorHandler = (err, req, res, next) => {
  const status = err.status || (err.code && err.code.startsWith('PGRST') ? 400 : 500);

  // Solo loguear ruidoso (con stack) los errores REALES del servidor (5xx).
  // Los 4xx (validaciones, 404 de escáneres/bots) se loguean en una línea, sin
  // stack y sin ir a Sentry, para no ensuciar logs ni gastar cuota.
  if (status >= 500) {
    console.error('🔥 Error capturado:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  } else {
    console.warn(`⚠️ ${status} ${req.method} ${req.originalUrl}: ${err.message}`);
  }

  // Error de Supabase
  if (err.code && err.code.startsWith('PGRST')) {
    return res.status(400).json({
      success: false,
      message: 'Error en la base de datos',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Error de base de datos'
    });
  }

  // Error de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      error: err.message
    });
  }

  // Error 404
  if (err.status === 404) {
    return res.status(404).json({
      success: false,
      message: 'Recurso no encontrado'
    });
  }

  // Error genérico del servidor
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : 'Error interno'
  });
};

// Middleware para rutas no encontradas.
// Responde 404 directo (sin generar un Error) para que los sondeos de bots a
// rutas inexistentes NO lleguen a Sentry ni generen stack traces. La request
// igual queda registrada por morgan.
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
};

module.exports = {
  errorHandler,
  notFound
};