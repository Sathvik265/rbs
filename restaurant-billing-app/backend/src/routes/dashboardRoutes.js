const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// GET /api/dashboard/top-items
router.get("/top-items", reportController.getTopItems);

module.exports = router;
