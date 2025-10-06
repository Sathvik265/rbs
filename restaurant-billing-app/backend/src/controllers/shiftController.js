const pool = require("../db");

// Simple in-memory demo store keyed by date string -> array of shift objects
const demoStore = {};

// For clerks to close their current shift
exports.closeShift = async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ detail: "Session ID is required" });
    }

    // Find the session and corresponding open shift
    const sessionQuery = await pool.query(
      `
      SELECT s.shift_code, s.session_date, sh.shift_id 
      FROM sessions s 
      JOIN shifts sh ON s.shift_code = sh.shift_name AND s.session_date = sh.date
      WHERE s.session_id = $1 AND sh.status = 'OPEN'`,
      [session_id]
    );

    if (sessionQuery.rows.length === 0) {
      return res
        .status(404)
        .json({ detail: "Active session or shift not found." });
    }

    const { shift_id } = sessionQuery.rows[0];

    // Close the shift
    const updateResult = await pool.query(
      "UPDATE shifts SET status = 'CLOSED', end_time = CURRENT_TIMESTAMP WHERE shift_id = $1 RETURNING *",
      [shift_id]
    );

    // Deactivate the session
    await pool.query(
      "UPDATE sessions SET is_active = false, end_timestamp = CURRENT_TIMESTAMP WHERE session_id = $1",
      [session_id]
    );

    res.json({
      detail: `Shift ${updateResult.rows[0].shift_name} closed successfully.`,
      shift: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Close shift error:", error);
    res.status(500).json({ detail: "Failed to close shift" });
  }
};

// For admins to manually toggle a shift's status
exports.manualToggle = async (req, res) => {
  try {
    // Accept either snake_case or camelCase field names for robustness
    console.log("Manual toggle request body:", req.body);
    const shiftId = req.body.shift_id || req.body.shiftId;
    let newStatus =
      req.body.new_status || req.body.newStatus || req.body.status;
    if (typeof newStatus === "string") newStatus = newStatus.toUpperCase();

    if (!shiftId || !newStatus || !["OPEN", "CLOSED"].includes(newStatus)) {
      return res.status(400).json({
        detail: "shiftId and a valid newStatus (OPEN or CLOSED) are required",
      });
    }

    console.log(`Manual toggle: Setting shift ${shiftId} to ${newStatus}`);

    // Explicitly cast parameters to avoid inconsistent-type errors
    const updateResult = await pool.query(
      "UPDATE shifts SET status = $1::varchar, end_time = CASE WHEN $1::varchar = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE shift_id = $2::uuid RETURNING *",
      [newStatus, shiftId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ detail: "Shift not found" });
    }

    console.log("Shift updated successfully:", updateResult.rows[0]);
    res.json({
      detail: `Shift status updated to ${newStatus}`,
      shift: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Manual toggle shift error:", error);
    res.status(500).json({ detail: "Failed to toggle shift status" });
  }
};

// For admins to get the status of all shifts for a given date (defaults to today)
// If no shifts exist for that date, initialize the 4 standard shifts and return them.
exports.getShiftStatus = async (req, res) => {
  try {
    // Accept optional date query param 'date' in YYYY-MM-DD
    const requestedDate =
      req.query?.date || new Date().toISOString().slice(0, 10);
    console.log("Getting shift status for date:", requestedDate);

    let result = await pool.query(
      "SELECT shift_id, shift_name, status, start_time, end_time, closed_by FROM shifts WHERE date = $1 ORDER BY shift_name",
      [requestedDate]
    );

    // If no shifts exist for that date, initialize the four standard shifts
    if (result.rows.length === 0) {
      console.log(
        "No shifts found for date, initializing default shifts for:",
        requestedDate
      );

      // Insert the four standard shifts using ON CONFLICT DO NOTHING and explicit casts
      const standardShifts = ["`", "``", "RBS1", "RBS2"];
      for (const shiftName of standardShifts) {
        // Explicitly cast parameters to avoid type deduction errors
        await pool.query(
          `INSERT INTO shifts (shift_name, date, start_time, status)
             VALUES ($1::varchar, $2::date, CURRENT_TIMESTAMP, 'OPEN')
             ON CONFLICT (shift_name, date) DO NOTHING`,
          [shiftName, requestedDate]
        );
      }

      // Re-query to return created shifts
      result = await pool.query(
        "SELECT shift_id, shift_name, status, start_time, end_time, closed_by FROM shifts WHERE date = $1 ORDER BY shift_name",
        [requestedDate]
      );
    }

    console.log("Shift status result:", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("Get shift status error:", error);
    res.status(500).json({ detail: "Failed to fetch shift statuses" });
  }
};

// Demo: return static shifts for UI demos (does not persist to DB)
exports.getShiftDemo = async (req, res) => {
  try {
    const requestedDate =
      req.query?.date || new Date().toISOString().slice(0, 10);
    if (!demoStore[requestedDate]) {
      // Create 4 demo shifts
      demoStore[requestedDate] = [
        {
          shift_id: "demo-1-" + requestedDate,
          shift_name: "`",
          status: "OPEN",
          start_time: new Date().toISOString(),
          end_time: null,
          closed_by: null,
        },
        {
          shift_id: "demo-2-" + requestedDate,
          shift_name: "``",
          status: "OPEN",
          start_time: new Date().toISOString(),
          end_time: null,
          closed_by: null,
        },
        {
          shift_id: "demo-3-" + requestedDate,
          shift_name: "RBS1",
          status: "OPEN",
          start_time: new Date().toISOString(),
          end_time: null,
          closed_by: null,
        },
        {
          shift_id: "demo-4-" + requestedDate,
          shift_name: "RBS2",
          status: "OPEN",
          start_time: new Date().toISOString(),
          end_time: null,
          closed_by: null,
        },
      ];
    }
    res.json(demoStore[requestedDate]);
  } catch (error) {
    console.error("getShiftDemo error:", error);
    res.status(500).json({ detail: "Failed to return demo shifts" });
  }
};

// Demo toggle: toggle the status in demoStore
exports.demoToggle = async (req, res) => {
  try {
    const shiftId = req.body.shift_id || req.body.shiftId;
    const requestedDate =
      req.query?.date || new Date().toISOString().slice(0, 10);
    if (!shiftId) return res.status(400).json({ detail: "shift_id required" });
    const list = demoStore[requestedDate];
    if (!list)
      return res.status(404).json({ detail: "No demo shifts for date" });
    const idx = list.findIndex((s) => s.shift_id === shiftId);
    if (idx === -1) return res.status(404).json({ detail: "Shift not found" });
    const shift = list[idx];
    shift.status = shift.status === "OPEN" ? "CLOSED" : "OPEN";
    if (shift.status === "CLOSED") {
      shift.end_time = new Date().toISOString();
      shift.closed_by = "DEMO";
    } else {
      shift.end_time = null;
      shift.closed_by = null;
    }
    list[idx] = shift;
    res.json({ detail: "Demo shifted toggled", shift });
  } catch (error) {
    console.error("demoToggle error:", error);
    res.status(500).json({ detail: "Failed to toggle demo shift" });
  }
};
