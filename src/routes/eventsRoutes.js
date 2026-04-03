const express = require('express');
const eventsController = require('../controllers/eventsController');
const router = express.Router();

// Rutas básicas que funcionan sin controladores complejos
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, title: 'Evento ejemplo 1', date: '2025-01-15', description: 'Descripción 1' },
      { id: 2, title: 'Evento ejemplo 2', date: '2025-01-20', description: 'Descripción 2' }
    ],
    message: 'Eventos desde API backend'
  });
});

router.get('/pending-requests', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Solicitudes pendientes'
  });
});

router.get('/upcoming', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Eventos próximos'
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: { id, title: `Evento ${id}`, date: '2025-01-15' },
    message: `Evento con ID ${id}`
  });
});

router.post('/', (req, res) => {
  res.status(201).json({
    success: true,
    data: { id: Date.now(), ...req.body },
    message: 'Evento creado'
  });
});

router.post('/notify-new-request', eventsController.notifyNewRequest);
router.post('/notify-request-response', eventsController.notifyRequestResponse);
router.post('/notify-massive', eventsController.notifyMassiveApprovedEvent);

module.exports = router;