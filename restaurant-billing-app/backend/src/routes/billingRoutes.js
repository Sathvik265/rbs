const express = require("express");
const router = express.Router();
const billingController = require("../controllers/billingController");

// POST /api/bill - Create a new bill
router.post("/", billingController.createBill);

// GET /api/bill/all - Get all bills
router.get("/all", billingController.getAllBills);

// GET /api/bill/last - Get last bill for a table
router.get("/last", billingController.getLastBill);

// GET /api/bill/by_date - Get bills by date
router.get("/by_date", billingController.getBillsByDate);

// GET /api/bill/next_number - Get next bill number
router.get("/next_number", billingController.getNextBillNumber);

module.exports = router;
