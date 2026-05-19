const express = require('express');
const router = express.Router();
const { broadcast } = require('../controllers/notificationsController');

// POST /api/notifications/broadcast
router.post('/broadcast', broadcast);

module.exports = router;
