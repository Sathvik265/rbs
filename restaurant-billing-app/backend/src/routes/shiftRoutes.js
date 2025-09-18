const express = require("express");
const ShiftController = require("../controllers/shiftController");
const router = express.Router();

// Shift management routes
router.post("/login", ShiftController.login);
router.put("/:sessionId/end", ShiftController.endShift);
router.get("/:sessionId", ShiftController.getSession);
router.get("/:sessionId/summary", ShiftController.getSessionSummary);
router.get("/", ShiftController.getAllSessions);
router.get("/date-range/search", ShiftController.getSessionsByDateRange);

module.exports = router;
