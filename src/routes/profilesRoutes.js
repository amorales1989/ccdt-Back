const express = require('express');
const router = express.Router();
const { searchProfiles } = require('../controllers/notificationsController');

// GET /api/profiles/search?q=xxx
router.get('/search', searchProfiles);

module.exports = router;
