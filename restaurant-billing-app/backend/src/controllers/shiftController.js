// Updated shift controller for the new database schema
// Works with the merged shift_sessions table instead of separate shifts and sessions

const pool = require("../db");

// Simple in-memory demo store keyed by date string -> array of shift session objects
const demoStore = {};

// For clerks to close their current shift session
exports.closeShift = async (req, res) => {
  try {
    const { shift_session_id, clerk_initials } = req.body;

    if (!shift_session_id && !clerk_initials) {
      return res.status(400).json({
        detail: "Either shift_session_id or clerk_initials is required",
      });
    }

    let updateQuery;
    let updateParams;

    if (shift_session_id) {
      // Close specific shift session by ID
      updateQuery = `
                UPDATE shift_sessions 
                SET status = 'CLOSED', end_time = CURRENT_TIMESTAMP
                WHERE shift_session_id = $1 AND status = 'OPEN'
                RETURNING *`;
      updateParams = [shift_session_id];
    } else {
      // Close current active shift session for the clerk
      updateQuery = `
                UPDATE shift_sessions 
                SET status = 'CLOSED', end_time = CURRENT_TIMESTAMP
                WHERE clerk_initials = $1 AND session_date = CURRENT_DATE AND status = 'OPEN'
                RETURNING *`;
      updateParams = [clerk_initials];
    }

    const updateResult = await pool.query(updateQuery, updateParams);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        detail: "Active shift session not found.",
      });
    }

    res.json({
      detail: `Shift session ${updateResult.rows[0].shift_name} closed successfully.`,
      shift_session: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Close shift error:", error);
    res.status(500).json({ detail: "Failed to close shift session" });
  }
};

// For admins to manually toggle a shift session's status
exports.manualToggle = async (req, res) => {
  try {
    // Enhanced logging to help trace clients sending malformed requests
    const requesterIp =
      req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress;
    console.log("Manual toggle request received from:", requesterIp);
    console.log("Manual toggle request headers:", req.headers);
    console.log("Manual toggle request body:", req.body);

    const shiftSessionId =
      req.body.shift_session_id ||
      req.body.shiftSessionId ||
      req.body.shift_id ||
      req.body.shiftId;
    let newStatus =
      req.body.new_status || req.body.newStatus || req.body.status;

    if (typeof newStatus === "string") newStatus = newStatus.toUpperCase();

    if (
      !shiftSessionId ||
      !newStatus ||
      !["OPEN", "CLOSED"].includes(newStatus)
    ) {
      return res.status(400).json({
        detail:
          "shift_session_id and a valid newStatus (OPEN or CLOSED) are required",
      });
    }

    console.log(
      `Manual toggle: Setting shift session ${shiftSessionId} to ${newStatus}`
    );

    const updateResult = await pool.query(
      `UPDATE shift_sessions 
             SET status = $1::varchar, 
                 end_time = CASE WHEN $1::varchar = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE NULL END
             WHERE shift_session_id = $2::uuid 
             RETURNING *`,
      [newStatus, shiftSessionId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ detail: "Shift session not found" });
    }

    console.log("Shift session updated successfully:", updateResult.rows[0]);

    res.json({
      detail: `Shift session status updated to ${newStatus}`,
      shift_session: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Manual toggle shift error:", error);
    res.status(500).json({ detail: "Failed to toggle shift session status" });
  }
};

// For admins to get the status of all shift sessions for a given date
exports.getShiftStatus = async (req, res) => {
  try {
    const requestedDate =
      req.query?.date || new Date().toISOString().slice(0, 10);
    console.log("Getting shift session status for date:", requestedDate);

    let result = await pool.query(
      `SELECT shift_session_id, shift_name, clerk_initials, status, start_time, end_time, closed_by
             FROM shift_sessions 
             WHERE session_date = $1 
             ORDER BY shift_name, start_time DESC`,
      [requestedDate]
    );

    // If no shift sessions exist for that date, initialize the four standard shift sessions
    if (result.rows.length === 0) {
      console.log(
        "No shift sessions found for date, initializing default shift sessions for:",
        requestedDate
      );

      const standardShifts = ["`", "``", "RBS1", "RBS2"];
      for (const shiftName of standardShifts) {
        await pool.query(
          `INSERT INTO shift_sessions (shift_name, clerk_initials, session_date, start_time, status)
                     VALUES ($1::varchar, 'SYS', $2::date, CURRENT_TIMESTAMP, 'OPEN')
                     ON CONFLICT (shift_name, session_date, clerk_initials) DO NOTHING`,
          [shiftName, requestedDate]
        );
      }

      // Re-query to return created shift sessions
      result = await pool.query(
        `SELECT shift_session_id, shift_name, clerk_initials, status, start_time, end_time, closed_by
                 FROM shift_sessions 
                 WHERE session_date = $1 
                 ORDER BY shift_name, start_time DESC`,
        [requestedDate]
      );
    }

    console.log("Shift session status result:", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("Get shift session status error:", error);
    res.status(500).json({ detail: "Failed to fetch shift session statuses" });
  }
};

// Create a new shift session for a clerk
exports.createShiftSession = async (req, res) => {
  try {
    const { shift_name, clerk_initials, session_date } = req.body;

    if (!shift_name || !clerk_initials) {
      return res.status(400).json({
        detail: "shift_name and clerk_initials are required",
      });
    }

    const date = session_date || new Date().toISOString().slice(0, 10);

    const result = await pool.query(
      `INSERT INTO shift_sessions (shift_name, clerk_initials, session_date, status)
             VALUES ($1, $2, $3, 'OPEN')
             ON CONFLICT (shift_name, session_date, clerk_initials) 
             DO UPDATE SET 
                status = 'OPEN', 
                start_time = CURRENT_TIMESTAMP,
                end_time = NULL
             RETURNING *`,
      [shift_name, clerk_initials, date]
    );

    res.json({
      detail: "Shift session created successfully",
      shift_session: result.rows[0],
    });
  } catch (error) {
    console.error("Create shift session error:", error);
    res.status(500).json({ detail: "Failed to create shift session" });
  }
};

// Get shift sessions for a specific clerk
exports.getClerkShiftSessions = async (req, res) => {
  try {
    const { clerk_initials } = req.params;
    const { date, active_only } = req.query;

    let query = `
            SELECT * FROM shift_sessions 
            WHERE clerk_initials = $1`;
    const params = [clerk_initials];

    if (date) {
      query += ` AND session_date = $${params.length + 1}`;
      params.push(date);
    }

    if (active_only === "true") {
      query += ` AND status = 'OPEN'`;
    }

    query += ` ORDER BY session_date DESC, start_time DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Get clerk shift sessions error:", error);
    res.status(500).json({ detail: "Failed to fetch clerk shift sessions" });
  }
};

// Demo: return static shift sessions for UI demos (does not persist to DB)
exports.getShiftDemo = async (req, res) => {
  try {
    const requestedDate =
      req.query?.date || new Date().toISOString().slice(0, 10);

    if (!demoStore[requestedDate]) {
      // Create 4 demo shift sessions
      demoStore[requestedDate] = [
        {
          shift_session_id: "demo-1-" + requestedDate,
          shift_name: "`",
          clerk_initials: "DEMO",
          status: "OPEN",
          start_time: new Date().toISOString(),
          end_time: null,
          closed_by: null,
          is_active: true,
        },
        {
          shift_session_id: "demo-2-" + requestedDate,
          shift_name: "``",
          clerk_initials: "DEMO",
          status: "OPEN",
          start_time: new Date().toISOString(),
          end_time: null,
          closed_by: null,
          is_active: true,
        },
        {
          shift_session_id: "demo-3-" + requestedDate,
          shift_name: "RBS1",
          clerk_initials: "DEMO",
          status: "OPEN",
          start_time: new Date().toISOString(),
          end_time: null,
          closed_by: null,
          is_active: true,
        },
        {
          shift_session_id: "demo-4-" + requestedDate,
          shift_name: "RBS2",
          clerk_initials: "DEMO",
          status: "OPEN",
          start_time: new Date().toISOString(),
          end_time: null,
          closed_by: null,
          is_active: true,
        },
      ];
    }

    res.json(demoStore[requestedDate]);
  } catch (error) {
    console.error("getShiftDemo error:", error);
    res.status(500).json({ detail: "Failed to return demo shift sessions" });
  }
};

// Demo toggle: toggle the status in demoStore
exports.demoToggle = async (req, res) => {
  try {
    const shiftSessionId = req.body.shift_session_id || req.body.shiftSessionId;
    const requestedDate =
      req.query?.date || new Date().toISOString().slice(0, 10);

    if (!shiftSessionId)
      return res.status(400).json({ detail: "shift_session_id required" });

    const list = demoStore[requestedDate];
    if (!list)
      return res
        .status(404)
        .json({ detail: "No demo shift sessions for date" });

    const idx = list.findIndex((s) => s.shift_session_id === shiftSessionId);
    if (idx === -1)
      return res.status(404).json({ detail: "Shift session not found" });

    const shiftSession = list[idx];
    shiftSession.status = shiftSession.status === "OPEN" ? "CLOSED" : "OPEN";
    shiftSession.is_active = shiftSession.status === "OPEN";

    if (shiftSession.status === "CLOSED") {
      shiftSession.end_time = new Date().toISOString();
      shiftSession.closed_by = "DEMO";
    } else {
      shiftSession.end_time = null;
      shiftSession.closed_by = null;
    }

    list[idx] = shiftSession;
    res.json({
      detail: "Demo shift session toggled",
      shift_session: shiftSession,
    });
  } catch (error) {
    console.error("demoToggle error:", error);
    res.status(500).json({ detail: "Failed to toggle demo shift session" });
  }
};
