const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');

// GET /api/material - Obtener materiales didácticos
router.get('/', materialController.getAll);

// POST /api/material - Crear nuevo material didáctico
router.post('/', materialController.create);

// DELETE /api/material/:id - Eliminar material didáctico
router.delete('/:id', materialController.delete);

module.exports = router;
