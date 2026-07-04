const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Rutas para webhooks de Supabase
router.post('/supabase/profiles', webhookController.handleProfileWebhook);
router.post('/supabase/events', webhookController.handleEventWebhook);
router.get('/cron/health-check', webhookController.handleCronHealthCheck);
router.post('/mercadopago', webhookController.mercadopago);

module.exports = router;
