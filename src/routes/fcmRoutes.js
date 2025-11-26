const express = require('express');
const router = express.Router();
const fcmController = require('../controllers/fcmController');
//const { authMiddleware } = require('../middleware/auth');

// Todas las rutas requieren autenticación
//router.use(authMiddleware);

// Tokens
router.post('/tokens/registrar', fcmController.registrarToken);
router.delete('/tokens/eliminar', fcmController.eliminarToken);

// Temas
router.post('/fcm/temas/suscribir', fcmController.suscribirATema);
router.post('/fcm/temas/desuscribir', fcmController.desuscribirDeTema);

module.exports = router;