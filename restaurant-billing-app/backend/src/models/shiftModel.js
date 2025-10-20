const pool = require("../db");

const ShiftModel = {
  // ==================== SHIFTS TABLE OPERATIONS ====================

  // Get all shifts
  async getAllShifts() {
    const result = await pool.query("SELECT * FROM shifts ORDER BY id");
    return result.rows;
  },

  // Get shift by name
  async getShiftByName(shiftName) {
    const result = await pool.query(
      "SELECT * FROM shifts WHERE shift_name = $1",
      [shiftName]
    );
    return result.rows[0];
  },

  // ==================== SESSIONS TABLE OPERATIONS ====================

  // Get all sessions
  async getAllSessions() {
    const result = await pool.query(
      "SELECT * FROM sessions ORDER BY session_date DESC, start_time DESC"
    );
    return result.rows;
  },

  // Get session by ID
  async getSessionById(sessionId) {
    const result = await pool.query("SELECT * FROM sessions WHERE id = $1", [
      sessionId,
    ]);
    return result.rows[0];
  },

  // Get session by UUID
  async getSessionByUUID(sessionUuid) {
    const result = await pool.query(
      "SELECT * FROM sessions WHERE session_id = $1",
      [sessionUuid]
    );
    return result.rows[0];
  },

  // Create a new session
  async createSession(sessionData) {
    const {
      shift_name,
      clerk_initials,
      session_date,
      start_time = null,
      status = "OPEN",
    } = sessionData;

    const result = await pool.query(
      `INSERT INTO sessions (
        shift_name, clerk_initials, session_date, start_time, status
      )
      VALUES ($1, $2, $3, COALESCE($4, CURRENT_TIMESTAMP), $5)
      RETURNING *`,
      [shift_name, clerk_initials, session_date, start_time, status]
    );
    return result.rows[0];
  },

  // Close a session
  async closeSession(sessionId, closedBy) {
    const result = await pool.query(
      `UPDATE sessions 
       SET status = 'CLOSED', 
           end_time = CURRENT_TIMESTAMP,
           closed_by = $1
       WHERE id = $2
       RETURNING *`,
      [closedBy, sessionId]
    );
    return result.rows[0];
  },

  // Get open sessions
  async getOpenSessions() {
    const result = await pool.query(
      "SELECT * FROM sessions WHERE status = 'OPEN' ORDER BY start_time DESC"
    );
    return result.rows;
  },

  // Get sessions by date
  async getSessionsByDate(sessionDate) {
    const result = await pool.query(
      "SELECT * FROM sessions WHERE session_date = $1 ORDER BY start_time",
      [sessionDate]
    );
    return result.rows;
  },

  // Get sessions by shift name
  async getSessionsByShift(shiftName) {
    const result = await pool.query(
      "SELECT * FROM sessions WHERE shift_name = $1 ORDER BY session_date DESC, start_time DESC",
      [shiftName]
    );
    return result.rows;
  },

  // Get current open session for a shift
  async getCurrentOpenSession(shiftName, sessionDate) {
    const result = await pool.query(
      `SELECT * FROM sessions 
       WHERE shift_name = $1 
         AND session_date = $2 
         AND status = 'OPEN'
       ORDER BY start_time DESC
       LIMIT 1`,
      [shiftName, sessionDate]
    );
    return result.rows[0];
  },

  // Get sessions by clerk
  async getSessionsByClerk(clerkInitials) {
    const result = await pool.query(
      "SELECT * FROM sessions WHERE clerk_initials = $1 ORDER BY session_date DESC, start_time DESC",
      [clerkInitials]
    );
    return result.rows;
  },

  // Get sessions in date range
  async getSessionsInDateRange(startDate, endDate) {
    const result = await pool.query(
      `SELECT * FROM sessions 
       WHERE session_date BETWEEN $1 AND $2 
       ORDER BY session_date DESC, start_time DESC`,
      [startDate, endDate]
    );
    return result.rows;
  },

  // Update session
  async updateSession(sessionId, updateData) {
    const { clerk_initials, start_time, end_time, status, closed_by } =
      updateData;

    const updates = [];
    const values = [];
    let paramCounter = 1;

    if (clerk_initials !== undefined) {
      updates.push(`clerk_initials = $${paramCounter++}`);
      values.push(clerk_initials);
    }
    if (start_time !== undefined) {
      updates.push(`start_time = $${paramCounter++}`);
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push(`end_time = $${paramCounter++}`);
      values.push(end_time);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCounter++}`);
      values.push(status);
    }
    if (closed_by !== undefined) {
      updates.push(`closed_by = $${paramCounter++}`);
      values.push(closed_by);
    }

    if (updates.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(sessionId);
    const query = `UPDATE sessions SET ${updates.join(
      ", "
    )} WHERE id = $${paramCounter} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Delete session
  async deleteSession(sessionId) {
    await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
  },

  // ==================== HELPER FUNCTIONS ====================

  // Get current shift type based on time
  async getCurrentShiftType() {
    const result = await pool.query("SELECT CURRENT_TIME as current_time");
    const currentTime = result.rows[0].current_time;

    const hour = parseInt(currentTime.split(":")[0]);

    if (hour >= 6 && hour < 12) {
      return "`"; // Morning shift
    } else if (hour >= 12 && hour < 18) {
      return "``"; // Afternoon shift
    } else if (hour >= 18 && hour < 22) {
      return "RBS1"; // Evening shift
    } else {
      return "RBS2"; // Night shift
    }
  },

  // Initialize today's sessions
  async initializeTodaySessions() {
    const today = new Date().toISOString().split("T")[0];
    const shifts = ["`", "``", "RBS1", "RBS2"];

    const results = [];
    for (const shift of shifts) {
      try {
        const existing = await this.getCurrentOpenSession(shift, today);
        if (!existing) {
          const session = await this.createSession({
            shift_name: shift,
            clerk_initials: "SYS",
            session_date: today,
            status: "OPEN",
          });
          results.push(session);
        }
      } catch (error) {
        console.error(`Error initializing session for ${shift}:`, error);
      }
    }
    return results;
  },
};

module.exports = ShiftModel;
