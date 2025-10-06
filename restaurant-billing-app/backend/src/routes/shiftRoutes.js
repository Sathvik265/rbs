const express = require("express");
const router = express.Router();
const shiftController = require("../controllers/shiftController");

// POST /api/shifts/close - For clerks to close their current shift
router.post("/close", shiftController.closeShift);

// POST /api/shifts/manual-toggle - For admins to manually toggle a shift's status
router.post("/manual-toggle", shiftController.manualToggle);

// GET /api/shifts/status - For admins to get the status of all shifts for the current date
router.get("/status", shiftController.getShiftStatus);

// GET /api/shifts/current - For getting current shift status (used by frontend)
router.get("/current", shiftController.getShiftStatus);

// Demo routes for UI-only demonstrations
// GET /api/shifts/demo?date=YYYY-MM-DD
router.get("/demo", shiftController.getShiftDemo);

// POST /api/shifts/demo-toggle - Toggle shift status in demo store
router.post("/demo-toggle", shiftController.demoToggle);

module.exports = router;
