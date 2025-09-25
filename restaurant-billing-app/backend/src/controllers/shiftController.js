const pool = require('../db');

// For clerks to close their current shift
exports.closeShift = async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ detail: 'Session ID is required' });
    }

    // Find the session and corresponding open shift
    const sessionQuery = await pool.query(
      `SELECT s.shift_code, s.session_date, sh.shift_id 
       FROM sessions s 
       JOIN shifts sh ON s.shift_code = sh.shift_name AND s.session_date = sh.date
       WHERE s.session_id = $1 AND sh.status = 'OPEN'`,
      [session_id]
    );

    if (sessionQuery.rows.length === 0) {
      return res.status(404).json({ detail: 'Active session or shift not found.' });
    }

    const { shift_id } = sessionQuery.rows[0];

    // Close the shift
    const updateResult = await pool.query(
      "UPDATE shifts SET status = 'CLOSED', end_time = CURRENT_TIMESTAMP WHERE shift_id = $1 RETURNING *",
      [shift_id]
    );

    // Deactivate the session
    await pool.query("UPDATE sessions SET is_active = false, end_timestamp = CURRENT_TIMESTAMP WHERE session_id = $1", [session_id]);

    res.json({ detail: `Shift ${updateResult.rows[0].shift_name} closed successfully.`, shift: updateResult.rows[0] });

  } catch (error) {
    console.error('Close shift error:', error);
    res.status(500).json({ detail: 'Failed to close shift' });
  }
};

// For admins to manually toggle a shift's status
exports.manualToggle = async (req, res) => {
  try {
    const { shift_id: shiftId, new_status: newStatus } = req.body;
    if (!shiftId || !newStatus || !['OPEN', 'CLOSED'].includes(newStatus)) {
      return res.status(400).json({ detail: 'shiftId and a valid newStatus (OPEN or CLOSED) are required' });
    }

    const updateResult = await pool.query(
      "UPDATE shifts SET status = $1, end_time = CASE WHEN $1 = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE shift_id = $2 RETURNING *",
      [newStatus, shiftId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ detail: 'Shift not found' });
    }

    res.json({ detail: `Shift status updated to ${newStatus}`, shift: updateResult.rows[0] });

  } catch (error) {
    console.error('Manual toggle shift error:', error);
    res.status(500).json({ detail: 'Failed to toggle shift status' });
  }
};

// For admins to get the status of all shifts for the current date
exports.getShiftStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      "SELECT shift_id, shift_name, status, start_time, end_time FROM shifts WHERE date = $1 ORDER BY shift_name",
      [today]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get shift status error:', error);
    res.status(500).json({ detail: 'Failed to fetch shift statuses' });
  }
};
