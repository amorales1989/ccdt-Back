const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Rutas para webhooks de Supabase
router.post('/supabase/profiles', webhookController.handleProfileWebhook);
router.post('/supabase/events', webhookController.handleEventWebhook);

module.exports = router;
