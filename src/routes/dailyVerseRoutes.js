const express = require('express');
const router = express.Router();
const dailyVerseController = require('../controllers/dailyVerseController');

router.get('/', dailyVerseController.get);

module.exports = router;
