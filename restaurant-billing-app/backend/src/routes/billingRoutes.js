const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');

router.post('/', billingController.createBill);
router.get('/all', billingController.getAllBills);
router.get('/last', billingController.getLastBill);
router.get('/by_date', billingController.getBillsByDate);
router.get('/next_number', billingController.getNextBillNumber);

module.exports = router;