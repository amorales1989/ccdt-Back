const express = require('express');
const router = express.Router();

// Importar controlador con manejo de errores
let studentsController;
try {
  studentsController = require('../controllers/studentsController');
} catch (error) {
  console.error('Error importing studentsController:', error.message);
  // Controlador temporal si hay error
  studentsController = {
    getAll: (req, res) => res.json({ success: true, data: [], message: 'Controller not available' })
  };
}

// Verificar que el controlador sea un objeto válido
if (!studentsController || typeof studentsController !== 'object') {
  console.error('studentsController is not a valid object');
  studentsController = {
    getAll: (req, res) => res.json({ success: true, data: [], message: 'Controller not available' })
  };
}

// GET /api/students - Obtener todos los estudiantes
router.get('/', studentsController.getAll || ((req, res) => res.json({ error: 'Method not implemented' })));

// GET /api/students/search - Buscar estudiantes
router.get('/search', studentsController.search || ((req, res) => res.json({ error: 'Method not implemented' })));

// GET /api/students/birthdays/upcoming - Obtener próximos cumpleaños
router.get('/birthdays/upcoming', studentsController.getUpcomingBirthdays || ((req, res) => res.json({ error: 'Method not implemented' })));

// GET /api/students/stats - Obtener estadísticas de estudiantes
router.get('/stats', studentsController.getStats || ((req, res) => res.json({ error: 'Method not implemented' })));

// GET /api/students/:id - Obtener estudiante por ID
router.get('/:id', studentsController.getById || ((req, res) => res.json({ error: 'Method not implemented' })));

// POST /api/students - Crear nuevo estudiante
router.post('/', studentsController.create || ((req, res) => res.json({ error: 'Method not implemented' })));

// PUT /api/students/:id - Actualizar estudiante
router.put('/:id', studentsController.update || ((req, res) => res.json({ error: 'Method not implemented' })));

// DELETE /api/students/:id - Eliminar estudiante
router.delete('/:id', studentsController.delete || ((req, res) => res.json({ error: 'Method not implemented' })));

module.exports = router;