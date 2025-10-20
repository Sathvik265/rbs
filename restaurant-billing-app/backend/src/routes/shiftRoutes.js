const express = require("express");
const router = express.Router();
const ShiftModel = require("../models/shiftModel");

// Shift routes
router.get("/shifts", async (req, res) => {
  try {
    const shifts = await ShiftModel.getAllShifts();
    res.json(shifts);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch shifts", details: error.message });
  }
});

router.get("/shifts/:shiftName", async (req, res) => {
  try {
    const shift = await ShiftModel.getShiftByName(req.params.shiftName);
    if (shift) {
      res.json(shift);
    } else {
      res.status(404).json({ error: "Shift not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch shift", details: error.message });
  }
});

// Session routes
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await ShiftModel.getAllSessions();
    res.json(sessions);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch sessions", details: error.message });
  }
});

router.get("/sessions/:sessionId", async (req, res) => {
  try {
    const session = await ShiftModel.getSessionById(req.params.sessionId);
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch session", details: error.message });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const session = await ShiftModel.createSession(req.body);
    res.status(201).json(session);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create session", details: error.message });
  }
});

router.put("/sessions/:sessionId/close", async (req, res) => {
  try {
    const { closedBy } = req.body;
    const session = await ShiftModel.closeSession(
      req.params.sessionId,
      closedBy
    );
    res.json(session);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to close session", details: error.message });
  }
});

router.get("/sessions/open/all", async (req, res) => {
  try {
    const sessions = await ShiftModel.getOpenSessions();
    res.json(sessions);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch open sessions", details: error.message });
  }
});

router.get("/sessions/date/:date", async (req, res) => {
  try {
    const sessions = await ShiftModel.getSessionsByDate(req.params.date);
    res.json(sessions);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch sessions", details: error.message });
  }
});

router.get("/current-shift", async (req, res) => {
  try {
    const shiftType = await ShiftModel.getCurrentShiftType();
    res.json({ shift_type: shiftType });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get current shift", details: error.message });
  }
});

router.post("/sessions/initialize-today", async (req, res) => {
  try {
    const sessions = await ShiftModel.initializeTodaySessions();
    res.json(sessions);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to initialize sessions", details: error.message });
  }
});

module.exports = router;
