const express = require('express');
const BillingController = require('../controllers/billingController');

const router = express.Router();

router.get('/bills', BillingController.getAllBills);
router.post('/bills', BillingController.createBill);

module.exports = router;