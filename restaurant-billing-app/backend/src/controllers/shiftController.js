const { ShiftModel } = require("../models/shiftModel");

class ShiftController {
  static async login(req, res) {
    try {
      const { clerkInitials, shiftCode, sessionDate } = req.body;
      // Normalize inputs and check any existing session
      let session = await ShiftModel.findOne({
        clerk_initials: clerkInitials.toUpperCase(),
        shift_code: shiftCode,
        session_date: sessionDate,
        is_active: true,
      });
      if (!session) {
        session = await ShiftModel.create({
          clerk_initials: clerkInitials.toUpperCase(),
          shift_code: shiftCode,
          session_date: sessionDate,
          login_timestamp: new Date(),
          is_active: true,
        });
      }
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async endShift(req, res) {
    try {
      const sessionId = req.params.sessionId;
      const session = await ShiftModel.findByIdAndUpdate(
        sessionId,
        { is_active: false, logout_timestamp: new Date() },
        { new: true }
      );
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSession(req, res) {
    try {
      const session = await ShiftModel.findById(req.params.sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getSessionsByDateRange(req, res) {
    try {
      const { start, end } = req.query;
      const sessions = await ShiftModel.find({
        session_date: { $gte: start, $lte: end },
      });
      res.json(sessions);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Add other methods as needed
}

module.exports = ShiftController;
