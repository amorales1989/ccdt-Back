const express = require('express');
const router = express.Router();
const { searchProfiles } = require('../controllers/notificationsController');
const profilesController = require('../controllers/profilesController');

// GET /api/profiles/search?q=xxx
router.get('/search', searchProfiles);

// POST /api/profiles/:id/convert-to-member — borra la cuenta y conserva a la persona como miembro
router.post('/:id/convert-to-member', profilesController.convertToMember);

// POST /api/profiles/:id/clear-member-departments — saca su ficha de miembro de todos los departamentos
router.post('/:id/clear-member-departments', profilesController.clearMemberDepartments);

module.exports = router;
