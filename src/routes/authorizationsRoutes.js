const express = require('express');
const authorizationsController = require('../controllers/authorizationsController');
const router = express.Router();

// GET /api/authorizations - Obtener todas las autorizaciones
router.get('/', authorizationsController.getAll);

// GET /api/authorizations/:id - Obtener autorización por ID
router.get('/:id', authorizationsController.getById);

// GET /api/authorizations/students/:student_id - Obtener autorizaciones de un estudiante
router.get('/students/:student_id', authorizationsController.getByStudent);

// GET /api/authorizations/departments/:department_id/students - Obtener estudiantes autorizados en un departamento
router.get('/departments/:department_id/students', authorizationsController.getAuthorizedStudents);

// POST /api/authorizations - Crear nueva autorización
router.post('/', authorizationsController.create);

// PUT /api/authorizations/:id - Actualizar autorización
router.put('/:id', authorizationsController.update);

// DELETE /api/authorizations/:id - Eliminar autorización
router.delete('/:id', authorizationsController.delete);

// DELETE /api/authorizations/students/:student_id/departments/:department_id - Eliminar autorización específica
router.delete('/students/:student_id/departments/:department_id', authorizationsController.deleteByStudentAndDepartment);

module.exports = router;