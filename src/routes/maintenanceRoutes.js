const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');

router.post('/notify', maintenanceController.notifyNewRequest);

module.exports = router;
