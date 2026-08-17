const express = require('express');
const router = express.Router();
const { searchProfiles } = require('../controllers/notificationsController');
const profilesController = require('../controllers/profilesController');

// GET /api/profiles/search?q=xxx
router.get('/search', searchProfiles);

// GET /api/profiles/staff-assignments — perfiles con assignments reales (user_metadata)
router.get('/staff-assignments', profilesController.getStaffAssignments);

// POST /api/profiles/:id/convert-to-member — borra la cuenta y conserva a la persona como miembro
router.post('/:id/convert-to-member', profilesController.convertToMember);

// POST /api/profiles/:id/clear-member-departments — saca su ficha de miembro de todos los departamentos
router.post('/:id/clear-member-departments', profilesController.clearMemberDepartments);

// POST /api/profiles/suspension/bulk — suspende/reactiva por lista de ids o por departamento
// (va antes de /:id/... para que "suspension" no se lea como un id)
router.post('/suspension/bulk', profilesController.bulkSetSuspension);

// PATCH /api/profiles/:id/suspension — suspende/reactiva una cuenta
router.patch('/:id/suspension', profilesController.setSuspension);

module.exports = router;
