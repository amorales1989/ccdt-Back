const express = require('express');
const router = express.Router();
const observationsController = require('../controllers/observationsController');

// GET /api/observations/:studentId - Obtener observaciones por alumno
router.get('/:studentId', observationsController.getByStudentId);

// POST /api/observations - Crear nueva observación
router.post('/', observationsController.create);

// PUT /api/observations/:id - Actualizar observación
router.put('/:id', observationsController.update);

// DELETE /api/observations/:id - Eliminar observación
router.delete('/:id', observationsController.delete);

module.exports = router;
