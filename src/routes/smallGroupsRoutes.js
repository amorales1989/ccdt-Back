const express = require('express');
const smallGroupsController = require('../controllers/smallGroupsController');
const router = express.Router();

// GET /api/small-groups - Listar grupos (admin: todos; resto: públicos + propios)
router.get('/', smallGroupsController.getAll);

// GET /api/small-groups/:id - Detalle de un grupo
router.get('/:id', smallGroupsController.getById);

// POST /api/small-groups - Crear grupo (admin/director)
router.post('/', smallGroupsController.create);

// PUT /api/small-groups/:id - Editar grupo (admin/director)
router.put('/:id', smallGroupsController.update);

// DELETE /api/small-groups/:id - Archivar grupo (admin/director)
router.delete('/:id', smallGroupsController.archive);

// GET /api/small-groups/:id/members - Roster (admin o líder/co-líder del grupo)
router.get('/:id/members', smallGroupsController.getMembers);

// POST /api/small-groups/:id/members - Agregar miembro (admin o líder/co-líder del grupo)
router.post('/:id/members', smallGroupsController.addMember);

// PATCH /api/small-groups/:id/members/:memberId - Cambiar rol/estado de un miembro
router.patch('/:id/members/:memberId', smallGroupsController.updateMember);

// DELETE /api/small-groups/:id/members/:memberId - Quitar miembro del grupo
router.delete('/:id/members/:memberId', smallGroupsController.removeMember);

// GET /api/small-groups/:id/meetings - Listar reuniones del grupo
router.get('/:id/meetings', smallGroupsController.getMeetings);

// POST /api/small-groups/:id/meetings - Registrar/actualizar una reunión
router.post('/:id/meetings', smallGroupsController.createMeeting);

// GET /api/small-groups/:id/meetings/:meetingId/attendance - Roster + asistencia de esa reunión
router.get('/:id/meetings/:meetingId/attendance', smallGroupsController.getAttendance);

// POST /api/small-groups/:id/meetings/:meetingId/attendance - Guardar asistencia (bulk)
router.post('/:id/meetings/:meetingId/attendance', smallGroupsController.saveAttendance);

module.exports = router;
