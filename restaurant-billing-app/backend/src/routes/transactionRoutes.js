const express = require("express");
const TransactionController = require("../controllers/transactionController");
const router = express.Router();

// Transaction routes
router.post("/bills", TransactionController.createBill);
router.put("/bills/:billId/print", TransactionController.printBill);
router.get("/bills/:billId", TransactionController.getBill);
router.get("/bills/number/:billNumber", TransactionController.getBillByNumber);
router.get("/sessions/:sessionId/bills", TransactionController.getSessionBills);
router.get("/bills", TransactionController.getBillsByDateRange);
router.get("/summary/:date", TransactionController.getDailySummary);

module.exports = router;
