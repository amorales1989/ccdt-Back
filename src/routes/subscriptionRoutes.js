const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const router = express.Router();

// GET /api/subscription - Estado de la suscripción de la empresa (solo admin)
router.get('/', subscriptionController.getSubscription);

// POST /api/subscription/renew - Generar link de pago MP para renovar (solo admin)
router.post('/renew', subscriptionController.renew);

// POST /api/subscription/subscribe - Crear débito automático MP (preapproval, opción principal) (solo admin)
router.post('/subscribe', subscriptionController.subscribe);

// GET /api/subscription/quote - Cotizar cambio de plan o packs con prorrateo (solo admin)
router.get('/quote', subscriptionController.quote);

// POST /api/subscription/change-plan - Cambiar de plan (solo admin)
router.post('/change-plan', subscriptionController.changePlan);

// POST /api/subscription/packs - Sumar/restar packs de miembros (solo admin)
router.post('/packs', subscriptionController.packs);

// GET /api/subscription/payments - Historial de pagos de la empresa (admin/secretaria)
router.get('/payments', subscriptionController.getPayments);

module.exports = router;
