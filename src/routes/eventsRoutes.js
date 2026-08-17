const express = require('express');
const eventsController = require('../controllers/eventsController');
const router = express.Router();

// GET /api/events - Eventos de la empresa (acepta ?from=YYYY-MM-DD)
router.get('/', eventsController.getAll);

// GET /api/events/pending-requests - Solicitudes de fecha pendientes
router.get('/pending-requests', eventsController.getPendingRequests);

// GET /api/events/upcoming - Eventos de hoy en adelante (sin solicitudes)
router.get('/upcoming', eventsController.getUpcoming);

// GET /api/events/:id
router.get('/:id', eventsController.getById);

// POST /api/events
router.post('/', eventsController.create);

router.post('/notify-new-request', eventsController.notifyNewRequest);
router.post('/notify-request-response', eventsController.notifyRequestResponse);
router.post('/notify-massive', eventsController.notifyMassiveApprovedEvent);

module.exports = router;