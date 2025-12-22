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
      SELECT b.*, b.track as shift_name
      FROM bills b
      WHERE b.created_at >= $1 AND b.created_at <= $2 AND b.bill_number > 0
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
      SELECT b.*, b.track as shift_name
      FROM bills b
      WHERE b.bill_date >= $1 AND b.bill_date <= $2 AND b.bill_number > 0
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
      WHERE b.bill_date = $1 AND b.track = $2 AND b.bill_number > 0
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
        track as shift_name,   
        COUNT(id) as bill_count,
        SUM(grand_total) as total_amount
      FROM bills
      WHERE bill_date = $1 AND bill_number > 0
      GROUP BY track
      ORDER BY track`,
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
      WHERE bill_date = $1 AND bill_number > 0
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
        item->>'item_name' as item_name,   
        SUM((item->>'quantity')::integer) as total_quantity,
        SUM((item->>'line_total')::decimal) as total_amount
      FROM bills b,
      jsonb_array_elements(b.items_json) as item
      WHERE b.bill_date = $1 AND b.bill_number > 0
      GROUP BY item->>'item_name'
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

// GET /api/reports/by-item (advanced item report with optional filters)
exports.getItemReport = async (req, res) => {
  try {
    const { startDate, endDate, item_name, category } = req.query;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ detail: "startDate and endDate are required" });
    }

    // Build dynamic WHERE clause for optional filters
    let whereConditions = [
      "b.bill_date >= $1",
      "b.bill_date <= $2",
      "b.bill_number > 0",
    ];
    let params = [startDate, endDate];
    let paramIndex = 3;

    if (item_name) {
      whereConditions.push(`item->>'item_name' ILIKE $${paramIndex}`);
      params.push(`%${item_name}%`);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`item->>'category' ILIKE $${paramIndex}`);
      params.push(`%${category}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    const result = await pool.query(
      `
      SELECT   
        item->>'item_name' as item_name,
        item->>'category' as category,
        SUM((item->>'quantity')::integer) as total_quantity,
        SUM((item->>'line_total')::decimal) as total_amount,
        b.track as shift_name
      FROM bills b,
      jsonb_array_elements(b.items_json) as item
      WHERE ${whereClause}
      GROUP BY item->>'item_name', item->>'category', b.track
      ORDER BY total_quantity DESC`,
      params
    );

    const formattedResult = result.rows.map((row) => ({
      itemName: row.item_name,
      category: row.category,
      totalQuantity: parseInt(row.total_quantity),
      totalAmount: parseFloat(row.total_amount),
      shiftName: row.shift_name,
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

// Settings using SettingsModel
const SettingsModel = require("../models/settingsModel");

// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    const { clerk } = req.query;
    // If clerk is passed, get for that clerk. Else default to 'CLK' or whoever is calling if we had auth middleware here.
    // For now, default to 'CLK' if no clerk specified (preserving admin UI behavior)
    // The frontend should ideally pass the logged-in clerk initials.
    const settings = await SettingsModel.getSettings(clerk || "CLK");

    // Fallback if null (shouldn't happen with ensureSettings, but safe check)
    if (!settings) {
      return res.json({
        hotel_name: "",
        phone: "",
        gstin: "",
        address: "",
        clerk_initials: clerk || "CLK",
      });
    }

    res.json(settings);
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ detail: "Failed to get settings" });
  }
};

// GET /api/settings/clerks
exports.getClerks = async (req, res) => {
  try {
    const clerks = await SettingsModel.getAllClerks();
    res.json(clerks);
  } catch (err) {
    console.error("Get clerks error:", err);
    res.status(500).json({ detail: "Failed to get clerks list" });
  }
};

// PUT /api/settings
exports.updateSettings = async (req, res) => {
  try {
    const { clerk } = req.query;
    // Update for specific clerk or 'CLK'
    const settings = await SettingsModel.updateSettings(
      clerk || "CLK",
      req.body
    );
    res.json(settings);
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

// GET /api/reports/category-totals
exports.getCategoryTotals = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ detail: "date is required" });
    }

    const result = await pool.query(
      "SELECT * FROM get_category_totals_for_date($1)",
      [date]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Category totals error:", error);
    res.status(500).json({ detail: "Failed to fetch category totals" });
  }
};
