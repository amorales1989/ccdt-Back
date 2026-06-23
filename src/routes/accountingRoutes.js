const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accountingController');

router.get('/transactions', accountingController.getTransactions);
router.post('/transactions', accountingController.createTransaction);
router.put('/transactions/:id', accountingController.updateTransaction);
router.delete('/transactions/:id', accountingController.deleteTransaction);

router.get('/categories', accountingController.getCategories);
router.get('/balance', accountingController.getBalance);

router.get('/opening-balance', accountingController.getOpeningBalance);
router.put('/opening-balance', accountingController.setOpeningBalance);

module.exports = router;
