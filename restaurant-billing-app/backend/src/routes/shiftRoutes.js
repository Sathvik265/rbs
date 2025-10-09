// Updated shift routes for the new database schema
// Works with the merged shift_sessions table

const express = require("express");
const router = express.Router();
const shiftController = require("../controllers/shiftController");

// POST /api/shifts/close - For clerks to close their current shift session
router.post("/close", shiftController.closeShift);

// POST /api/shifts/manual-toggle - For admins to manually toggle a shift session's status
router.post("/manual-toggle", shiftController.manualToggle);

// GET /api/shifts/status - For admins to get the status of all shift sessions for the current date
router.get("/status", shiftController.getShiftStatus);

// GET /api/shifts/current - For getting current shift session status (used by frontend)
router.get("/current", shiftController.getShiftStatus);

// POST /api/shifts/create - Create a new shift session for a clerk
router.post("/create", shiftController.createShiftSession);

// GET /api/shifts/clerk/:clerk_initials - Get shift sessions for a specific clerk
router.get("/clerk/:clerk_initials", shiftController.getClerkShiftSessions);

// Demo routes for UI-only demonstrations
// GET /api/shifts/demo?date=YYYY-MM-DD
router.get("/demo", shiftController.getShiftDemo);

// POST /api/shifts/demo-toggle - Toggle shift session status in demo store
router.post("/demo-toggle", shiftController.demoToggle);

module.exports = router;
