const pool = require("../db");

// GET /api/reports/time-range
exports.getTimeRangeReport = async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;
    if (!date || !startTime || !endTime) {
      return res
        .status(400)
        .json({ detail: "date, startTime, and endTime are required" });
    }

    const startTimestamp = `${date} ${startTime}`;
    const endTimestamp = `${date} ${endTime}`;

    const result = await pool.query(
      `
      SELECT b.*, s.shift_name
      FROM bills b
      LEFT JOIN shifts s ON b.shift_id = s.shift_id
      WHERE b.created_at >= $1 AND b.created_at <= $2
      ORDER BY b.created_at`,
      [startTimestamp, endTimestamp]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Time range report error:", error);
    res.status(500).json({ detail: "Failed to generate time range report" });
  }
};

// GET /api/reports/date-range
exports.getDateRangeReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ detail: "startDate and endDate are required" });
    }

    const result = await pool.query(
      `
      SELECT b.*, s.shift_name
      FROM bills b
      LEFT JOIN shifts s ON b.shift_id = s.shift_id
      WHERE b.bill_date >= $1 AND b.bill_date <= $2
      ORDER BY b.bill_date, b.bill_number`,
      [startDate, endDate]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Date range report error:", error);
    res.status(500).json({ detail: "Failed to generate date range report" });
  }
};

// GET /api/reports/by-shift
exports.getShiftReport = async (req, res) => {
  try {
    const { date, shift_name: shiftName } = req.query;
    if (!date || !shiftName) {
      return res
        .status(400)
        .json({ detail: "date and shiftName are required" });
    }

    const result = await pool.query(
      `
      SELECT b.*
      FROM bills b
      JOIN shifts s ON b.shift_id = s.shift_id
      WHERE s.date = $1 AND s.shift_name = $2
      ORDER BY b.bill_number`,
      [date, shiftName]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Shift report error:", error);
    res.status(500).json({ detail: "Failed to generate shift report" });
  }
};

// GET /api/reports/shift-wise (for the frontend Reports component)
exports.getShiftWiseReport = async (req, res) => {
  try {
    const { bill_date } = req.query;
    if (!bill_date) {
      return res.status(400).json({ detail: "bill_date is required" });
    }

    console.log("Generating shift-wise report for date:", bill_date);

    const result = await pool.query(
      `
      SELECT   
        s.shift_name,   
        COUNT(b.id) as bill_count,
        SUM(b.grand_total) as total_amount
      FROM bills b
      JOIN shifts s ON b.shift_id = s.shift_id
      WHERE b.bill_date = $1
      GROUP BY s.shift_name
      ORDER BY s.shift_name`,
      [bill_date]
    );

    console.log("Shift-wise report result:", result.rows);
    res.json({ report: result.rows });
  } catch (error) {
    console.error("Shift wise report error:", error);
    res.status(500).json({ detail: "Failed to generate shift wise report" });
  }
};

// GET /api/reports/time-wise (for the frontend Reports component)
exports.getTimeWiseReport = async (req, res) => {
  try {
    const { bill_date } = req.query;
    if (!bill_date) {
      return res.status(400).json({ detail: "bill_date is required" });
    }

    console.log("Generating time-wise report for date:", bill_date);

    const result = await pool.query(
      `
      SELECT   
        TO_CHAR(created_at, 'HH24:00') as time_slot,
        COUNT(id) as bill_count,
        SUM(grand_total) as total_amount
      FROM bills
      WHERE bill_date = $1
      GROUP BY time_slot
      ORDER BY time_slot`,
      [bill_date]
    );

    console.log("Time-wise report result:", result.rows);
    res.json({ report: result.rows });
  } catch (error) {
    console.error("Time wise report error:", error);
    res.status(500).json({ detail: "Failed to generate time wise report" });
  }
};

// GET /api/reports/item-wise (for the frontend Reports component)
exports.getItemWiseReport = async (req, res) => {
  try {
    const { bill_date } = req.query;
    if (!bill_date) {
      return res.status(400).json({ detail: "bill_date is required" });
    }

    console.log("Generating item-wise report for date:", bill_date);

    const result = await pool.query(
      `
      SELECT   
        bi.item_name,   
        SUM(bi.quantity) as total_quantity,
        SUM(bi.line_total) as total_amount
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.bill_date = $1
      GROUP BY bi.item_name
      ORDER BY total_quantity DESC`,
      [bill_date]
    );

    console.log("Item-wise report result:", result.rows);
    res.json({ report: result.rows });
  } catch (error) {
    console.error("Item wise report error:", error);
    res.status(500).json({ detail: "Failed to generate item wise report" });
  }
};

// GET /api/reports/by-item (advanced item report with shift breakdown)
exports.getItemReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ detail: "startDate and endDate are required" });
    }

    const result = await pool.query(
      `
      SELECT   
        bi.item_name,   
        SUM(bi.quantity) as total_quantity,
        json_object_agg(s.shift_name, COALESCE(shift_quantities.quantity, 0)) as sold_in_shifts
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      LEFT JOIN shifts s ON b.shift_id = s.shift_id
      LEFT JOIN (
        SELECT 
          bi2.item_name,
          s2.shift_name,
          SUM(bi2.quantity) as quantity
        FROM bill_items bi2
        JOIN bills b2 ON bi2.bill_id = b2.id
        JOIN shifts s2 ON b2.shift_id = s2.shift_id
        WHERE b2.bill_date >= $1 AND b2.bill_date <= $2
        GROUP BY bi2.item_name, s2.shift_name
      ) shift_quantities ON bi.item_name = shift_quantities.item_name AND s.shift_name = shift_quantities.shift_name
      WHERE b.bill_date >= $1 AND b.bill_date <= $2
      GROUP BY bi.item_name
      ORDER BY total_quantity DESC`,
      [startDate, endDate]
    );

    const formattedResult = result.rows.map((row) => ({
      itemName: row.item_name,
      totalQuantity: parseInt(row.total_quantity),
      soldInShifts: row.sold_in_shifts || {},
    }));

    res.json(formattedResult);
  } catch (error) {
    console.error("Item report error:", error);
    res.status(500).json({ detail: "Failed to generate item report" });
  }
};

// GET /api/reconciliation/unprinted
exports.getUnprintedBills = async (req, res) => {
  try {
    // Get bills from the last 24 hours that haven't been modified
    const result = await pool.query(`
      SELECT   
        b.*,   
        s.shift_name   
      FROM bills b
      JOIN shifts s ON b.shift_id = s.shift_id
      WHERE b.created_at > NOW() - INTERVAL '24 hours' 
        AND b.modified_from_bill_id IS NULL
      ORDER BY b.created_at DESC`);

    res.json(result.rows);
  } catch (error) {
    console.error("Unprinted bills error:", error);
    res.status(500).json({ detail: "Failed to fetch unprinted bills" });
  }
};

// GET /api/reconciliation/running
exports.getRunningBills = async (req, res) => {
  try {
    // Group pending orders by table_no and party_no and include created_at from the latest order
    const result = await pool.query(
      `
      SELECT
        o.table_no,
        o.party_no,
        MAX(o.created_at) as created_at,
        SUM(o.line_total) as total_amount,
        COUNT(o.id) as items_count
      FROM orders o
      GROUP BY o.table_no, o.party_no
      ORDER BY MAX(o.created_at) DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Running bills error:", error);
    res.status(500).json({ detail: "Failed to fetch running bills" });
  }
};

// Simple settings storage in-memory for quick compatibility
let _settings_store = {
  hotel_name: "",
  phone: "",
  gstin: "",
  address: "",
};

// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    res.json(_settings_store);
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ detail: "Failed to get settings" });
  }
};

// PUT /api/settings
exports.updateSettings = async (req, res) => {
  try {
    _settings_store = { ..._settings_store, ...req.body };
    res.json(_settings_store);
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ detail: "Failed to update settings" });
  }
};

// GET /api/dashboard/top-items
exports.getTopItems = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const result = await pool.query(
      `
      SELECT   
        bi.item_name,   
        SUM(bi.quantity) as total_quantity
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE b.bill_date = $1
      GROUP BY bi.item_name
      ORDER BY total_quantity DESC
      LIMIT 5`,
      [today]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Top items error:", error);
    res.status(500).json({ detail: "Failed to fetch top items" });
  }
};
