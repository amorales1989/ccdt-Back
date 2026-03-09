const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.get('/estado', whatsappController.getStatus);
router.post('/conectar', whatsappController.connect);
router.post('/desconectar', whatsappController.disconnect);
router.post('/test', whatsappController.testMessage);

module.exports = router;
