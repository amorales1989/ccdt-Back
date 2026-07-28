const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats/resumen - Resumen de la pantalla Estadísticas (SP api.estadisticas_resumen)
router.get('/resumen', statsController.resumen);

module.exports = router;
