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
    console.error("Time range report error:", error, error && error.stack);
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
    console.error("Date range report error:", error, error && error.stack);
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

    // Try legacy schema first (b.shift_id)
    try {
      const result = await pool.query(
        `
        SELECT b.*
        FROM bills b
        JOIN shifts s ON b.shift_id = s.shift_id
        WHERE b.bill_date = $1 AND s.shift_name = $2
        ORDER BY b.bill_number`,
        [date, shiftName]
      );

      return res.json(result.rows);
    } catch (err) {
      console.log('Legacy by-shift query failed, trying sessions-based fallback:', err && err.message);
    }

    // Fallback: find bills whose created_at falls in a session for the given date and shift_name
    const fallback = await pool.query(
      `
      SELECT b.*
      FROM bills b
      LEFT JOIN sessions s ON s.session_date = (b.created_at::date) AND b.created_at >= s.start_time AND (s.end_time IS NULL OR b.created_at <= s.end_time)
      WHERE b.created_at::date = $1 AND s.shift_name = $2
      ORDER BY b.created_at, b.bill_number
      `,
      [date, shiftName]
    );

    res.json(fallback.rows);
  } catch (error) {
    console.error("Shift report error:", error, error && error.stack);
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

    // Try legacy schema first (b.shift_id)
    try {
      const result = await pool.query(
        `
        SELECT   
          s.shift_name,   
          COUNT(b.*) as bill_count,
          SUM(COALESCE(b.grand_total, b.total_amount)) as total_amount
        FROM bills b
        JOIN shifts s ON b.shift_id = s.shift_id
        WHERE b.bill_date = $1
        GROUP BY s.shift_name
        ORDER BY s.shift_name`,
        [bill_date]
      );

      console.log("Shift-wise report result:", result.rows);
      return res.json({ report: result.rows });
    } catch (err) {
      console.log('Legacy shift query failed, trying sessions-based fallback:', err && err.message);
    }

    // Fallback: map bills to sessions using created_at between session start/end
    const fallback = await pool.query(
      `
      SELECT
        s.shift_name,
        COUNT(b.*) as bill_count,
        SUM(COALESCE(b.grand_total, b.total_amount)) as total_amount
      FROM bills b
      LEFT JOIN sessions s ON s.session_date = (b.created_at::date) AND b.created_at >= s.start_time AND (s.end_time IS NULL OR b.created_at <= s.end_time)
      WHERE b.created_at::date = $1
      GROUP BY s.shift_name
      ORDER BY s.shift_name
      `,
      [bill_date]
    );

    console.log("Shift-wise report fallback result:", fallback.rows);
    res.json({ report: fallback.rows });
  } catch (error) {
    console.error("Shift wise report error:", error, error && error.stack);
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
      GROUP BY TO_CHAR(created_at, 'HH24:00')
      ORDER BY TO_CHAR(created_at, 'HH24:00')`,
      [bill_date]
    );

    console.log("Time-wise report result:", result.rows);
    res.json({ report: result.rows });
  } catch (error) {
    console.error("Time wise report error:", error, error && error.stack);
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

    // Try legacy bill_items table first
    try {
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

      console.log("Item-wise report result (bill_items):", result.rows);
      return res.json({ report: result.rows });
    } catch (err) {
      console.log('bill_items query failed, falling back to bills.items JSONB:', err && err.message);
    }

    // Fallback: extract from bills.items JSONB and aggregate
    const fallback = await pool.query(
      `
      SELECT
        item->> 'name' as item_name,
        SUM((item->> 'quantity')::int) as total_quantity,
        SUM((item->> 'line_total')::numeric) as total_amount
      FROM bills, jsonb_array_elements(bills.items) as item
      WHERE (bills.bill_date = $1 OR bills.created_at::date = $1)
      GROUP BY item_name
      ORDER BY total_quantity DESC
      `,
      [bill_date]
    );

    console.log("Item-wise report result (JSONB):", fallback.rows);
    res.json({ report: fallback.rows });
  } catch (error) {
    console.error("Item wise report error:", error, error && error.stack);
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



      // Only use fallback JSONB + time slot logic for item report

    // Fallback: aggregate from bills.items JSONB and join to sessions for shift breakdown
    const totals = await pool.query(
      `
      SELECT item->> 'name' as item_name,
             SUM((item->> 'quantity')::int) as total_quantity
      FROM bills, jsonb_array_elements(bills.items) as item
      WHERE (bills.bill_date >= $1 AND bills.bill_date <= $2) OR (bills.created_at::date >= $1 AND bills.created_at::date <= $2)
      GROUP BY item_name
      ORDER BY total_quantity DESC
      `,
      [startDate, endDate]
    );

    // Use fixed time slots for shifts
    const byShift = await pool.query(
      `
      SELECT
        CASE
          WHEN EXTRACT(HOUR FROM b.created_at) >= 6 AND EXTRACT(HOUR FROM b.created_at) < 14 THEN 'Morning'
          WHEN EXTRACT(HOUR FROM b.created_at) >= 14 AND EXTRACT(HOUR FROM b.created_at) < 18 THEN 'Afternoon'
          WHEN EXTRACT(HOUR FROM b.created_at) >= 18 AND EXTRACT(HOUR FROM b.created_at) < 24 THEN 'Evening'
          ELSE 'Night'
        END AS shift_name,
        item->> 'name' as item_name,
        SUM((item->> 'quantity')::int) as qty
      FROM bills b,
           jsonb_array_elements(b.items) as item
      WHERE (b.created_at::date >= $1 AND b.created_at::date <= $2)
      GROUP BY shift_name, item_name
      ORDER BY item_name, shift_name
      `,
      [startDate, endDate]
    );

    // Build mapping of item -> { totalQuantity, soldInShifts }
    const shiftMap = {};
    for (const row of byShift.rows) {
      const item = row.item_name;
      shiftMap[item] = shiftMap[item] || {};
      shiftMap[item][row.shift_name || 'Unknown'] = parseInt(row.qty || 0);
    }

    const formatted = totals.rows.map((r) => ({
      itemName: r.item_name,
      totalQuantity: parseInt(r.total_quantity || 0),
      soldInShifts: shiftMap[r.item_name] || {},
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Item report error:", error, error && error.stack);
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
    console.error("Unprinted bills error:", error, error && error.stack);
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
    console.error("Running bills error:", error, error && error.stack);
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
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ detail: "Failed to fetch settings" });
  }
};

// PUT /api/settings - update in-memory settings
exports.updateSettings = async (req, res) => {
  try {
    const newSettings = req.body || {};
    _settings_store = Object.assign({}, _settings_store, newSettings);
    res.json(_settings_store);
  } catch (error) {
    console.error("Update settings error:", error);
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
    console.error("Top items error:", error, error && error.stack);
    res.status(500).json({ detail: "Failed to fetch top items" });
  }
};

// GET /api/reports/category-totals
exports.getCategoryTotals = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ detail: "date is required" });
    }

    // Fallback implementation: aggregate bill_items by category using items table if available
    const result = await pool.query(
      `
      SELECT COALESCE(i.category, 'Uncategorized') AS category,
             SUM(bi.line_total) AS total_sales,
             SUM(bi.quantity) AS total_quantity
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      LEFT JOIN items i ON i.name = bi.item_name
      WHERE b.bill_date = $1
      GROUP BY COALESCE(i.category, 'Uncategorized')
      ORDER BY total_sales DESC
      `,
      [date]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Category totals error:", error, error && error.stack);
    res.status(500).json({ detail: "Failed to fetch category totals" });
  }
  };
