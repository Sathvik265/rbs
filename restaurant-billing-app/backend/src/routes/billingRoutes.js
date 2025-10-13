const express = require("express");
const router = express.Router();
const billingController = require("../controllers/billingController");

// Order routes
router.post("/order", billingController.createOrder);
router.get(
  "/order/pending/:table_no",
  billingController.getPendingOrdersByTable
);

// Bill routes
router.post("/", billingController.createBill);
router.get("/next_number", billingController.getNextBillNumber);
router.get("/all", billingController.getAllBills);

module.exports = router;
