const express = require('express');
const router = express.Router();
const staffReportsController = require('../controllers/staffReportsController');

router.get('/', staffReportsController.getReports);
router.get('/eligible', staffReportsController.getEligibleStaff);
router.get('/unread-count', staffReportsController.getUnreadCount);
router.put('/mark-read', staffReportsController.markAsRead);
router.post('/', staffReportsController.create);
router.put('/:id', staffReportsController.update);
router.delete('/:id', staffReportsController.delete);

module.exports = router;
