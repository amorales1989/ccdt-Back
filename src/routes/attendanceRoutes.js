const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// GET /api/attendance/coverage - Qué clases tomaron asistencia un día y cuáles no
router.get('/coverage', attendanceController.coverage);

// DELETE /api/attendance/by-date - Eliminar toda la asistencia de una fecha
router.delete('/by-date', attendanceController.deleteByDate);

module.exports = router;
