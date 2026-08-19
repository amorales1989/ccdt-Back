const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// GET /api/attendance/coverage - Qué clases tomaron asistencia un día y cuáles no
router.get('/coverage', attendanceController.coverage);

// GET /api/attendance/matrix - Matriz de asistencia (grilla) agregada en la DB
router.get('/matrix', attendanceController.matrix);

// GET /api/attendance/events - Días especiales (sin clase) de un rango
router.get('/events', attendanceController.events);

// POST /api/attendance/events - Marcar un día como evento especial
router.post('/events', attendanceController.createEvent);

// DELETE /api/attendance/events/:id - Quitar el evento especial de un día
router.delete('/events/:id', attendanceController.deleteEvent);

// DELETE /api/attendance/by-date - Eliminar toda la asistencia de una fecha
router.delete('/by-date', attendanceController.deleteByDate);

module.exports = router;
