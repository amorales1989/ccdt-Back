const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// DELETE /api/attendance/by-date - Eliminar toda la asistencia de una fecha
router.delete('/by-date', attendanceController.deleteByDate);

module.exports = router;
