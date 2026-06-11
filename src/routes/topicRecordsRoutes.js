const express = require('express');
const router = express.Router();
const topicRecordsController = require('../controllers/topicRecordsController');

router.get('/', topicRecordsController.getAll);
router.post('/', topicRecordsController.create);
router.put('/:id', topicRecordsController.update);
router.delete('/:id', topicRecordsController.delete);

module.exports = router;
