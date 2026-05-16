const express = require('express');
const router = express.Router();
const toursController = require('../controllers/toursController');

router.get('/', toursController.list);
router.post('/complete', toursController.complete);
router.delete('/:tour_key', toursController.reset);

module.exports = router;
