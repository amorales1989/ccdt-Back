const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');

// GET /api/maintenance/requests?status=pendiente,en_proceso
router.get('/requests', maintenanceController.getRequests);

router.post('/notify', maintenanceController.notifyNewRequest);

module.exports = router;
