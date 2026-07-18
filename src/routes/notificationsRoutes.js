const express = require('express');
const router = express.Router();
const { broadcast, getMine, markMineRead, getBroadcasts } = require('../controllers/notificationsController');

// POST /api/notifications/broadcast
router.post('/broadcast', broadcast);

// GET /api/notifications/broadcasts — historial de envíos (admin/secretaria)
router.get('/broadcasts', getBroadcasts);

// GET /api/notifications/mine — bandeja del usuario autenticado
router.get('/mine', getMine);

// POST /api/notifications/mine/read — marcar leídas (todas o por ids)
router.post('/mine/read', markMineRead);

module.exports = router;
