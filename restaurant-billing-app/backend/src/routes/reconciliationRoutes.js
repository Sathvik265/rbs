const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// GET /api/reconciliation/unprinted
router.get("/unprinted", reportController.getUnprintedBills);

module.exports = router;
