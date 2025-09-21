const express = require('express');
const departmentsController = require('../controllers/departmentsController');
const router = express.Router();

// GET /api/departments - Obtener todos los departamentos
router.get('/', departmentsController.getAll);

// GET /api/departments/:id - Obtener departamento por ID
router.get('/:id', departmentsController.getById);

// GET /api/departments/:id/classes - Obtener clases de un departamento
router.get('/:id/classes', departmentsController.getClasses);

// GET /api/departments/:id/students - Obtener estudiantes de un departamento
router.get('/:id/students', departmentsController.getStudents);

// GET /api/departments/:id/stats - Obtener estadísticas de un departamento
router.get('/:id/stats', departmentsController.getStats);

// POST /api/departments - Crear nuevo departamento
router.post('/', departmentsController.create);

// PUT /api/departments/:id - Actualizar departamento
router.put('/:id', departmentsController.update);

// PUT /api/departments/:id/classes - Actualizar clases de un departamento
router.put('/:id/classes', departmentsController.updateClasses);

// DELETE /api/departments/:id - Eliminar departamento
router.delete('/:id', departmentsController.delete);

module.exports = router;