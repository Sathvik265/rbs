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

  // Create a new session or update existing if shift_name already exists
  async createSession(sessionData) {
    const {
      shift_name,
      clerk_initials,
      session_date = "1970-01-01", // Default to fixed date
      start_time = null,
      status = "OPEN",
    } = sessionData;

    // Check if a session for this shift_name already exists
    const existingSession = await pool.query(
      `SELECT * FROM sessions WHERE shift_name = $1`,
      [shift_name]
    );

    if (existingSession.rows.length > 0) {
      // If session exists, update its status and other relevant fields
      const sessionId = existingSession.rows[0].id;
      const result = await pool.query(
        `UPDATE sessions
         SET clerk_initials = $1,
             session_date = $2,
             start_time = COALESCE($3, CURRENT_TIMESTAMP),
             status = $4,
             end_time = NULL,
             closed_by = NULL
         WHERE id = $5
         RETURNING *`,
        [clerk_initials, session_date, start_time, status, sessionId]
      );
      return result.rows[0];
    } else {
      // If no session exists, create a new one
      const result = await pool.query(
        `INSERT INTO sessions (
          shift_name, clerk_initials, session_date, start_time, status
        )
        VALUES ($1, $2, $3, COALESCE($4, CURRENT_TIMESTAMP), $5)
        RETURNING *`,
        [shift_name, clerk_initials, session_date, start_time, status]
      );
      return result.rows[0];
    }
  },

  // Close a session
  async closeSession(sessionUuid, closedBy) {
    // Try to update the new `sessions` table first (uses session_id)
    try {
      const shiftResult = await pool.query(
        `UPDATE sessions
           SET status = 'CLOSED',
               end_time = CURRENT_TIMESTAMP,
               closed_by = $1
           WHERE session_id = $2
           RETURNING *`,
        [closedBy, sessionUuid]
      );

      if (shiftResult.rows.length > 0) {
        console.log(
          `shiftModel.closeSession: updated sessions by session_id=${sessionUuid}`
        );
        return shiftResult.rows[0];
      }
    } catch (err) {
      // ignore and try legacy table
      console.error(
        "Error updating sessions (continuing with legacy sessions):",
        err.message
      );
    }

    // Fallback to legacy `sessions` table (uses session_id)
    const result = await pool.query(
      `UPDATE sessions
         SET status = 'CLOSED',
             end_time = CURRENT_TIMESTAMP,
             closed_by = $1
         WHERE session_id = $2
         RETURNING *`,
      [closedBy, sessionUuid]
    );

    const updatedSession = result.rows[0];
    if (!updatedSession) return null;

    // Also attempt to close the corresponding sessions row (match by shift_name and session_date)
    try {
      const syncResult = await pool.query(
        `UPDATE sessions
           SET status = 'CLOSED',
               end_time = CURRENT_TIMESTAMP,
               closed_by = $1
           WHERE shift_name = $2 AND session_date = $3
           RETURNING *`,
        [closedBy, updatedSession.shift_name, updatedSession.session_date]
      );

      if (syncResult.rows.length > 0) {
        console.log(
          `shiftModel.closeSession: synced close to sessions for shift=${updatedSession.shift_name} date=${updatedSession.session_date}`
        );
        return syncResult.rows[0];
      }
    } catch (err) {
      console.error("Error syncing close to sessions:", err.message);
    }

    return updatedSession;
  },
  // Get open sessions
  async getOpenSessions() {
    const result = await pool.query(
      "SELECT * FROM sessions WHERE status = 'OPEN' ORDER BY start_time DESC"
    );
    return result.rows;
  },

  // Get all sessions (sessionDate is irrelevant)
  async getSessionsByDate(sessionDate) {
    // sessionDate parameter is now ignored
    const result = await pool.query(
      "SELECT * FROM sessions ORDER BY shift_name, start_time" // Order by shift_name
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
  async getCurrentOpenSession(shiftName) {
    // Removed sessionDate
    const result = await pool.query(
      `SELECT * FROM sessions
         WHERE shift_name = $1
           AND status = 'OPEN'
         ORDER BY start_time DESC
         LIMIT 1`,
      [shiftName]
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

  // Reopen a closed session
  async reopenSession(sessionUuid) {
    const result = await pool.query(
      `UPDATE sessions
       SET status = 'OPEN',
           end_time = NULL,
           closed_by = NULL
       WHERE session_id = $1
       RETURNING *`,
      [sessionUuid]
    );

    const updatedSession = result.rows[0];
    if (!updatedSession) return null;

    // Also attempt to reopen the corresponding sessions row (match by shift_name and session_date)
    try {
      const syncResult = await pool.query(
        `UPDATE sessions
         SET status = 'OPEN',
             end_time = NULL,
             closed_by = NULL,
             start_time = COALESCE(start_time, CURRENT_TIMESTAMP)
         WHERE shift_name = $1 AND session_date = $2
         RETURNING *`,
        [updatedSession.shift_name, updatedSession.session_date]
      );

      if (syncResult.rows.length > 0) {
        console.log(
          `shiftModel.reopenSession: synced reopen to sessions for shift=${updatedSession.shift_name} date=${updatedSession.session_date}`
        );
        return syncResult.rows[0];
      }
    } catch (err) {
      console.error("Error syncing reopen to sessions:", err.message);
    }

    return updatedSession;
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

  // Ensure all shift types have a session entry, creating if not exists
  async ensureAllShiftSessionsExist() {
    const shifts = ["`", "``", "RBS1", "RBS2"];
    const fixedDate = "1970-01-01"; // Use a fixed date as session_date is irrelevant

    const results = [];
    for (const shift of shifts) {
      try {
        // Check if a session for this shift_name already exists
        const existing = await pool.query(
          `SELECT * FROM sessions WHERE shift_name = $1`,
          [shift]
        );

        if (existing.rows.length === 0) {
          // If no session exists, create a new one
          const session = await this.createSession({
            shift_name: shift,
            clerk_initials: "SYS",
            session_date: fixedDate, // Use fixed date
            status: "CLOSED", // Start as closed, will be opened by scheduler
          });
          results.push(session);
        } else {
          results.push(existing.rows[0]); // Add existing session to results
        }
      } catch (error) {
        console.error(`Error ensuring session for ${shift}:`, error);
      }
    }
    return results;
  },
};

module.exports = ShiftModel;
