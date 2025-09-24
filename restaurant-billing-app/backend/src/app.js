const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./db");
const cron = require("node-cron"); // NEW: Add cron for scheduled tasks
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Rate limiting - development tuned
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
app.use("/api/", limiter);

// CORS config
app.use(
  cors({
    origin: ["http://127.0.0.1:3000", "http://localhost:3000"],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ================== SHIFT AUTOMATION (CRON JOBS) ==================

// Daily Shift Opening Job - runs at 12:00 AM (00:00)
cron.schedule("0 0 * * *", async () => {
  console.log("Running daily shift opening job...");
  try {
    const currentDate = new Date().toISOString().split("T");
    const shiftNames = ["MORNING", "AFTERNOON", "RBS1", "RBS2"];

    for (const shiftName of shiftNames) {
      await pool.query(
        `INSERT INTO shifts (shift_name, date, start_time, status)
         VALUES ($1, $2, CURRENT_TIMESTAMP, 'OPEN')
         ON CONFLICT (shift_name, date) DO NOTHING`,
        [shiftName, currentDate]
      );
    }

    console.log(`✅ Created shifts for date: ${currentDate}`);
  } catch (error) {
    console.error("❌ Error creating daily shifts:", error);
  }
});

// Daily Shift Closing Job - runs at 11:59 PM (23:59)
cron.schedule("59 23 * * *", async () => {
  console.log("Running daily shift closing job...");
  try {
    const result = await pool.query(`
      UPDATE shifts
      SET status = 'CLOSED', end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'OPEN'
    `);
    console.log(`✅ Closed ${result.rowCount} open shifts`);
  } catch (error) {
    console.error("❌ Error closing daily shifts:", error);
  }
});

// Initialize shifts for today on startup
const initializeTodaysShifts = async () => {
  try {
    const currentDate = new Date().toISOString().split("T");
    const shiftNames = ["`", "``", "RBS1", "RBS2"];

    for (const shiftName of shiftNames) {
      await pool.query(
        `INSERT INTO shifts (shift_name, date, start_time, status)
         VALUES ($1, $2, CURRENT_TIMESTAMP, 'OPEN')
         ON CONFLICT (shift_name, date) DO NOTHING`,
        [shiftName, currentDate]
      );
    }

    console.log(`✅ Initialized shifts for today: ${currentDate}`);
  } catch (error) {
    console.error("❌ Error initializing today's shifts:", error);
  }
};

// Helper function to get current active shift
const getCurrentShiftId = async () => {
  try {
    const result = await pool.query(`
      SELECT get_current_shift_id() as shift_id
    `);
    return result.rows?.shift_id || null;
  } catch (error) {
    console.error("Error getting current shift ID:", error);
    return null;
  }
};

// ================== AUTH ROUTES ==================

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { staff_code, is_root = false } = req.body;
    if (!staff_code)
      return res.status(400).json({ detail: "Staff code required" });

    const upperStaffCode = staff_code.toUpperCase();
    let mode = "none";
    if (upperStaffCode === "CLK") mode = "clerk";
    else if (upperStaffCode === "SHI")
      mode = is_root ? "admin-full" : "admin-limited";
    else return res.status(401).json({ detail: "Invalid credentials" });

    res.json({ mode });
  } catch (error) {
    console.error("Auth login error:", error);
    res.status(500).json({ detail: "Authentication failed" });
  }
});

// NEW: POST /api/auth/transfer - Logout without closing shift
app.post("/api/auth/transfer", async (req, res) => {
  try {
    // This endpoint simply confirms the logout without affecting shift state
    // In a real implementation, you might want to track session transfers
    res.json({
      success: true,
      message: "User logged out, shift remains active",
    });
  } catch (error) {
    console.error("Auth transfer error:", error);
    res.status(500).json({ detail: "Transfer failed" });
  }
});

// ================== SHIFT MANAGEMENT ROUTES ==================

// NEW: POST /api/shifts/close - Close the currently active shift
app.post("/api/shifts/close", async (req, res) => {
  try {
    const { user_id = "CLERK", shift_type } = req.body; // Optional parameters

    // Get current date
    const currentDate = new Date().toISOString().split("T");

    // Determine which shift to close based on current time if not specified
    let shiftToClose = shift_type;
    if (!shiftToClose) {
      const currentHour = new Date().getHours();
      if (currentHour >= 6 && currentHour < 12) {
        shiftToClose = "`";
      } else if (currentHour >= 12 && currentHour < 18) {
        shiftToClose = "``";
      } else if (currentHour >= 18 && currentHour < 22) {
        shiftToClose = "RBS1";
      } else {
        shiftToClose = "RBS2";
      }
    }

    // Close the shift
    const result = await pool.query(
      `UPDATE shifts
       SET status = 'CLOSED',
           end_time = CURRENT_TIMESTAMP,
           closed_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE shift_name = $2
         AND date = $3
         AND status = 'OPEN'
       RETURNING *`,
      [user_id, shiftToClose, currentDate]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        detail: "No open shift found to close",
      });
    }

    const closedShift = result.rows;

    res.json({
      success: true,
      shift: {
        shift_id: closedShift.shift_id,
        shift_name: closedShift.shift_name,
        date: closedShift.date,
        closed_by: closedShift.closed_by,
        end_time: closedShift.end_time,
      },
      message: `${closedShift.shift_name} shift closed successfully`,
    });
  } catch (error) {
    console.error("Close shift error:", error);
    res.status(500).json({ detail: "Failed to close shift" });
  }
});

// NEW: POST /api/shifts/reopen/:shiftId - Reopen a closed shift (Admin only)
app.post("/api/shifts/reopen/:shiftId", async (req, res) => {
  try {
    const { shiftId } = req.params;
    const { user_id = "ADMIN" } = req.body;

    // Validate shiftId format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(shiftId)) {
      return res.status(400).json({ detail: "Invalid shift ID format" });
    }

    // Reopen the shift
    const result = await pool.query(
      `UPDATE shifts
       SET status = 'OPEN',
           end_time = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE shift_id = $1
         AND status = 'CLOSED'
       RETURNING *`,
      [shiftId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        detail: "Shift not found or already open",
      });
    }

    const reopenedShift = result.rows;

    // Log the reopen action
    await pool.query(
      `INSERT INTO audit_log (
         performed_by_user_name, user_role, action_type, resource_type, resource_id, payload
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user_id,
        "admin",
        "SHIFT_REOPENED",
        "shift",
        shiftId,
        JSON.stringify({
          shift_name: reopenedShift.shift_name,
          date: reopenedShift.date,
          reopened_by: user_id,
          reopened_at: new Date().toISOString(),
        }),
      ]
    );

    res.json({
      success: true,
      shift: {
        shift_id: reopenedShift.shift_id,
        shift_name: reopenedShift.shift_name,
        date: reopenedShift.date,
        status: reopenedShift.status,
      },
      message: `${reopenedShift.shift_name} shift reopened successfully`,
    });
  } catch (error) {
    console.error("Reopen shift error:", error);
    res.status(500).json({ detail: "Failed to reopen shift" });
  }
});

// NEW: GET /api/shifts/current - Get current shift status
app.get("/api/shifts/current", async (req, res) => {
  try {
    const currentDate = new Date().toISOString().split("T");
    const result = await pool.query(
      `SELECT * FROM shifts
       WHERE date = $1
       ORDER BY shift_name`,
      [currentDate]
    );

    res.json({
      date: currentDate,
      shifts: result.rows.map((shift) => ({
        shift_id: shift.shift_id,
        shift_name: shift.shift_name,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        status: shift.status,
        closed_by: shift.closed_by,
      })),
    });
  } catch (error) {
    console.error("Get current shifts error:", error);
    res.status(500).json({ detail: "Failed to get current shifts" });
  }
});

// ================== REPORTS ROUTES ==================

// NEW: GET /api/reports/by-shift - Get bills by shift ID (Admin only)
app.get("/api/reports/by-shift", async (req, res) => {
  try {
    const { shiftId } = req.query;
    if (!shiftId) {
      return res
        .status(400)
        .json({ detail: "shiftId query parameter is required" });
    }

    const result = await pool.query(
      `SELECT b.*,
              json_agg(
                json_build_object(
                  'item_code', bi.item_code,
                  'item_name', bi.item_name,
                  'quantity', bi.quantity,
                  'unit_price', bi.unit_price,
                  'line_total', bi.line_total
                ) ORDER BY bi.id
              ) as items
       FROM bills b
       LEFT JOIN bill_items bi ON b.id = bi.bill_id
       WHERE b.shift_id = $1
       GROUP BY b.id
       ORDER BY b.bill_number DESC`,
      [shiftId]
    );

    // Also get shift details
    const shiftResult = await pool.query(
      `SELECT * FROM shifts WHERE shift_id = $1`,
      [shiftId]
    );

    if (shiftResult.rows.length === 0) {
      return res.status(404).json({ detail: "Shift not found" });
    }

    res.json({
      shift: shiftResult.rows,
      bills: result.rows.map((bill) => ({
        id: bill.id,
        bill_number: bill.bill_number,
        bill_date: bill.bill_date,
        table_no: bill.table_no,
        party_no: bill.party_no,
        grand_total: parseFloat(bill.grand_total),
        created_at: bill.created_at,
        items: bill.items.filter((item) => item.item_code), // Remove null items
      })),
      summary: {
        total_bills: result.rows.length,
        total_amount: result.rows.reduce(
          (sum, bill) => sum + parseFloat(bill.grand_total),
          0
        ),
      },
    });
  } catch (error) {
    console.error("Get bills by shift error:", error);
    res.status(500).json({ detail: "Failed to get bills by shift" });
  }
});

// NEW: GET /api/reports/by-item - Get item sales summary (Admin only)
app.get("/api/reports/by-item", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        detail: "startDate and endDate query parameters are required",
      });
    }

    const result = await pool.query(
      `SELECT
         bi.item_name,
         bi.item_code,
         SUM(bi.quantity) as total_quantity,
         AVG(bi.unit_price) as avg_unit_price,
         SUM(bi.line_total) as total_revenue,
         COUNT(DISTINCT b.id) as times_ordered
       FROM bill_items bi
       INNER JOIN bills b ON bi.bill_id = b.id
       WHERE b.bill_date >= $1 AND b.bill_date <= $2
       GROUP BY bi.item_name, bi.item_code
       ORDER BY total_revenue DESC`,
      [startDate, endDate]
    );

    const summaryResult = await pool.query(
      `SELECT
         COUNT(DISTINCT b.id) as total_bills,
         SUM(b.grand_total) as total_revenue,
         COUNT(DISTINCT b.bill_date) as days_covered
       FROM bills b
       WHERE b.bill_date >= $1 AND b.bill_date <= $2`,
      [startDate, endDate]
    );

    res.json({
      period: {
        start_date: startDate,
        end_date: endDate,
      },
      summary: {
        total_bills: parseInt(summaryResult.rows.total_bills) || 0,
        total_revenue: parseFloat(summaryResult.rows.total_revenue) || 0,
        days_covered: parseInt(summaryResult.rows.days_covered) || 0,
        total_items: result.rows.length,
      },
      items: result.rows.map((item) => ({
        item_name: item.item_name,
        item_code: item.item_code,
        total_quantity: parseInt(item.total_quantity),
        avg_unit_price: parseFloat(item.avg_unit_price),
        total_revenue: parseFloat(item.total_revenue),
        times_ordered: parseInt(item.times_ordered),
      })),
    });
  } catch (error) {
    console.error("Get item report error:", error);
    res.status(500).json({ detail: "Failed to generate item report" });
  }
});

// NEW: GET /api/reports/by-time - Get bills by time window (Admin only)
app.get("/api/reports/by-time", async (req, res) => {
  try {
    const { date, startTime, endTime } = req.query;
    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        detail: "date, startTime, and endTime query parameters are required",
      });
    }

    // Construct datetime strings
    const startDateTime = `${date} ${startTime}`;
    const endDateTime = `${date} ${endTime}`;

    const result = await pool.query(
      `SELECT b.*,
              json_agg(
                json_build_object(
                  'item_code', bi.item_code,
                  'item_name', bi.item_name,
                  'quantity', bi.quantity,
                  'unit_price', bi.unit_price,
                  'line_total', bi.line_total
                ) ORDER BY bi.id
              ) as items
       FROM bills b
       LEFT JOIN bill_items bi ON b.id = bi.bill_id
       WHERE b.bill_date = $1
         AND b.created_at >= $2::timestamp
         AND b.created_at <= $3::timestamp
       GROUP BY b.id
       ORDER BY b.created_at ASC`,
      [date, startDateTime, endDateTime]
    );

    res.json({
      time_window: {
        date: date,
        start_time: startTime,
        end_time: endTime,
      },
      bills: result.rows.map((bill) => ({
        id: bill.id,
        bill_number: bill.bill_number,
        bill_date: bill.bill_date,
        table_no: bill.table_no,
        party_no: bill.party_no,
        grand_total: parseFloat(bill.grand_total),
        created_at: bill.created_at,
        items: bill.items.filter((item) => item.item_code), // Remove null items
      })),
      summary: {
        total_bills: result.rows.length,
        total_amount: result.rows.reduce(
          (sum, bill) => sum + parseFloat(bill.grand_total),
          0
        ),
        time_span: `${startTime} - ${endTime}`,
      },
    });
  } catch (error) {
    console.error("Get time report error:", error);
    res.status(500).json({ detail: "Failed to generate time report" });
  }
});

// ================== MENU ROUTES ==================

// GET /api/menu - all menu items
app.get("/api/menu", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM items WHERE is_active = true ORDER BY category, name"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get menu error:", error);
    res.status(500).json({ detail: "Failed to fetch menu items" });
  }
});

// POST /api/menu - add menu item
app.post("/api/menu", async (req, res) => {
  try {
    const {
      name,
      alpha_code,
      numeric_code,
      price_fixed,
      price_general,
      price_ac,
      category,
    } = req.body;

    if (!name || (!alpha_code && !numeric_code)) {
      return res.status(400).json({ detail: "Name and code required" });
    }

    const result = await pool.query(
      `INSERT INTO items (name, alpha_code, numeric_code, price_fixed, price_general, price_ac, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        name,
        alpha_code?.toUpperCase(),
        numeric_code,
        parseFloat(price_fixed) || 0,
        parseFloat(price_general) || 0,
        parseFloat(price_ac) || 0,
        category,
      ]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Add menu item error:", error);
    if (error.constraint)
      res.status(400).json({ detail: "Item code already exists" });
    else res.status(500).json({ detail: "Failed to add menu item" });
  }
});

// DELETE /api/menu/:id
app.delete("/api/menu/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE items SET is_active = false WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ detail: "Item not found" });

    res.json(result.rows);
  } catch (error) {
    console.error("Delete menu item error:", error);
    res.status(500).json({ detail: "Failed to delete menu item" });
  }
});

// GET /api/menu/lookup/:code
app.get("/api/menu/lookup/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();
    const result = await pool.query(
      `SELECT * FROM items 
       WHERE (UPPER(alpha_code) = $1 OR UPPER(numeric_code) = $1) AND is_active = true LIMIT 1`,
      [upperCode]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ detail: "Item not found" });

    res.json(result.rows);
  } catch (error) {
    console.error("Lookup item error:", error);
    res.status(500).json({ detail: "Failed to lookup item" });
  }
});

// ================== BILLING ROUTES ==================

// GET /api/bill/next_number
app.get("/api/bill/next_number", async (req, res) => {
  try {
    const { bill_date } = req.query;
    if (!bill_date)
      return res.status(400).json({ detail: "bill_date is required" });

    const result = await pool.query(
      "SELECT COALESCE(MAX(bill_number), 0) as last_number FROM bills WHERE bill_date = $1",
      [bill_date]
    );

    const nextNumber = (result.rows?.last_number || 0) + 1;
    res.json({ bill_number: nextNumber });
  } catch (error) {
    console.error("Get next bill number error:", error);
    res.status(500).json({ detail: "Failed to get next bill number" });
  }
});

// MODIFIED: POST /api/bill - Now includes shift_id
app.post("/api/bill", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { header, item_codes, quantities, bill_date, modified_from_bill_id } =
      req.body;

    if (!header || !item_codes || !quantities || !bill_date) {
      await client.query("ROLLBACK");
      return res.status(400).json({ detail: "Missing required fields" });
    }

    // Get current shift ID
    const shiftId = await getCurrentShiftId();

    // Get next bill number atomically
    const billNumberResult = await client.query(
      "SELECT COALESCE(MAX(bill_number), 0) + 1 as next_number FROM bills WHERE bill_date = $1",
      [bill_date]
    );
    const billNumber = billNumberResult.rows.next_number;

    // Create bill items
    const billItems = [];
    let subtotal = 0;

    for (let i = 0; i < item_codes.length; i++) {
      const code = item_codes[i];
      const quantity = quantities[i];

      const itemResult = await client.query(
        "SELECT * FROM items WHERE (UPPER(alpha_code) = $1 OR UPPER(numeric_code) = $1) AND is_active = true",
        [code.toUpperCase()]
      );

      if (itemResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ detail: `Item not found: ${code}` });
      }

      const item = itemResult.rows;
      let unitPrice;
      switch (header.section) {
        case "AC":
          unitPrice = item.price_ac;
          break;
        case "P":
          unitPrice = item.price_fixed;
          break;
        default:
          unitPrice = item.price_general;
      }

      const lineTotal = quantity * unitPrice;
      subtotal += lineTotal;

      billItems.push({
        code: code.toUpperCase(),
        name: item.name,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
      });
    }

    // Calculate taxes (2.5% SGST + 2.5% CGST)
    const sgst = subtotal * 0.025;
    const cgst = subtotal * 0.025;
    const taxAmount = sgst + cgst;
    const grandTotal = subtotal + taxAmount;

    // MODIFIED: Insert bill with shift_id
    const billResult = await client.query(
      `INSERT INTO bills (bill_number, bill_date, table_no, party_no, section, track, clerk_initials, shift_id, subtotal, sgst, cgst, tax_amount, grand_total, modified_from_bill_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        billNumber,
        bill_date,
        header.table_no,
        header.party_no,
        header.section,
        header.track,
        header.clerk_initials,
        shiftId, // NEW: Include shift_id
        subtotal,
        sgst,
        cgst,
        taxAmount,
        grandTotal,
        modified_from_bill_id,
      ]
    );

    const bill = billResult.rows;

    // Insert bill items
    for (const item of billItems) {
      await client.query(
        `INSERT INTO bill_items (bill_id, item_code, item_name, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          bill.id,
          item.code,
          item.name,
          item.quantity,
          item.unit_price,
          item.line_total,
        ]
      );
    }

    // Get settings for bill printing
    const settingsResult = await client.query("SELECT * FROM settings LIMIT 1");
    const settings = settingsResult.rows || {};

    await client.query("COMMIT");

    // Prepare response data for printing
    const responseData = {
      id: bill.id,
      header: {
        bill_number: billNumber,
        table_no: header.table_no,
        party_no: header.party_no,
        section: header.section,
      },
      items: billItems,
      subtotal: subtotal,
      sgst: sgst,
      cgst: cgst,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      created_at: bill.created_at,
      hotel_name: settings.hotel_name || "Restaurant Name",
      address: settings.address || "",
      phone: settings.phone || "",
      gstin: settings.gstin || "",
    };

    res.json(responseData);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create bill error:", error);
    res.status(500).json({ detail: "Failed to create bill" });
  } finally {
    client.release();
  }
});

// GET /api/bill/last
app.get("/api/bill/last", async (req, res) => {
  try {
    const { table_no, bill_date } = req.query;
    if (!table_no || !bill_date)
      return res
        .status(400)
        .json({ detail: "table_no and bill_date are required" });

    const billResult = await pool.query(
      `SELECT b.*, array_agg(
         json_build_object(
           'code', bi.item_code,
           'name', bi.item_name,
           'quantity', bi.quantity,
           'unit_price', bi.unit_price,
           'line_total', bi.line_total
         ) ORDER BY bi.id
       ) as items
       FROM bills b
       LEFT JOIN bill_items bi ON b.id = bi.bill_id
       WHERE b.table_no = $1 AND b.bill_date = $2
       GROUP BY b.id
       ORDER BY b.bill_number DESC
       LIMIT 1`,
      [table_no, bill_date]
    );

    if (billResult.rows.length === 0)
      return res.status(404).json({ detail: "No previous bill found" });

    const bill = billResult.rows;
    res.json({
      id: bill.id,
      header: {
        table_no: bill.table_no,
        party_no: bill.party_no,
        section: bill.section,
        bill_number: bill.bill_number,
      },
      items: bill.items.filter((item) => item.code),
    });
  } catch (error) {
    console.error("Get last bill error:", error);
    res.status(500).json({ detail: "Failed to get last bill" });
  }
});

// GET /api/bills/by_date
app.get("/api/bills/by_date", async (req, res) => {
  try {
    const { bill_date } = req.query;
    if (!bill_date)
      return res.status(400).json({ detail: "bill_date is required" });

    const result = await pool.query(
      `SELECT b.id, b.bill_number, b.table_no, b.party_no, b.grand_total, b.created_at,
              json_agg(json_build_object(
                'name', bi.item_name,
                'quantity', bi.quantity,
                'unit_price', bi.unit_price,
                'line_total', bi.line_total
              )) as items
       FROM bills b
       LEFT JOIN bill_items bi ON b.id = bi.bill_id
       WHERE b.bill_date = $1
       GROUP BY b.id, b.bill_number, b.table_no, b.party_no, b.grand_total, b.created_at
       ORDER BY b.bill_number DESC`,
      [bill_date]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get bills by date error:", error);
    res.status(500).json({ detail: "Failed to get bills" });
  }
});

// ================== SETTINGS ROUTES ==================

// GET /api/settings
app.get("/api/settings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM settings ORDER BY id LIMIT 1"
    );
    const settings = result.rows || {
      hotel_name: "Restaurant Name",
      address: "",
      phone: "",
      gstin: "",
    };
    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ detail: "Failed to get settings" });
  }
});

// PUT /api/settings
app.put("/api/settings", async (req, res) => {
  try {
    const { hotel_name, address, phone, gstin } = req.body;
    const result = await pool.query(
      `INSERT INTO settings (hotel_name, address, phone, gstin) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) 
       DO UPDATE SET 
         hotel_name = EXCLUDED.hotel_name,
         address = EXCLUDED.address,
         phone = EXCLUDED.phone,
         gstin = EXCLUDED.gstin,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [hotel_name, address, phone, gstin]
    );

    if (result.rows.length === 0) {
      const updateResult = await pool.query(
        `UPDATE settings SET 
           hotel_name = $1, address = $2, phone = $3, gstin = $4,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT id FROM settings ORDER BY id LIMIT 1)
         RETURNING *`,
        [hotel_name, address, phone, gstin]
      );

      if (updateResult.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO settings (hotel_name, address, phone, gstin) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [hotel_name, address, phone, gstin]
        );
        return res.json(insertResult.rows);
      }
      return res.json(updateResult.rows);
    }

    res.json(result.rows);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ detail: "Failed to update settings" });
  }
});

// ================== ADMIN MODULE ENHANCEMENTS ==================

// GET /api/admin/dashboard
app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T");

    const salesResult = await pool.query(
      "SELECT COALESCE(SUM(grand_total), 0) as total_sales, COUNT(*) as total_bills FROM bills WHERE bill_date = $1",
      [today]
    );

    const tablesResult = await pool.query(
      `SELECT DISTINCT table_no FROM bills WHERE bill_date = $1 AND created_at >= $2`,
      [today, new Date(Date.now() - 2 * 60 * 60 * 1000)]
    );

    const totalTables = 50;
    const occupiedTables = tablesResult.rows.length;
    const vacantTables = totalTables - occupiedTables;

    const topItemsResult = await pool.query(
      `SELECT bi.item_name, SUM(bi.quantity) as total_quantity, SUM(bi.line_total) as total_sales
       FROM bill_items bi
       INNER JOIN bills b ON bi.bill_id = b.id
       WHERE b.bill_date = $1
       GROUP BY bi.item_name
       ORDER BY total_quantity DESC
       LIMIT 5`,
      [today]
    );

    const billsCount = salesResult.rows.total_bills;

    res.json({
      totalSales: parseFloat(salesResult.rows.total_sales),
      totalBills: parseInt(billsCount),
      occupiedTables: occupiedTables,
      vacantTables: vacantTables,
      topSellingItems: topItemsResult.rows.map((item) => ({
        name: item.item_name,
        quantity: parseInt(item.total_quantity),
        sales: parseFloat(item.total_sales),
      })),
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    res.status(500).json({ detail: "Failed to fetch dashboard metrics" });
  }
});

// GET /api/admin/reports/sales
app.get("/api/admin/reports/sales", async (req, res) => {
  try {
    const { start_date, end_date, report_type = "daily" } = req.query;
    if (!start_date || !end_date)
      return res
        .status(400)
        .json({ detail: "start_date and end_date are required" });

    const salesSummary = await pool.query(
      `SELECT 
         COUNT(DISTINCT b.id) as total_orders,
         COALESCE(SUM(b.grand_total), 0) as total_revenue,
         COALESCE(SUM(b.subtotal), 0) as subtotal,
         COALESCE(SUM(b.tax_amount), 0) as total_tax,
         COUNT(DISTINCT b.bill_date) as days_covered,
         COUNT(DISTINCT b.clerk_initials) as active_clerks
       FROM bills b
       WHERE b.bill_date >= $1 AND b.bill_date <= $2`,
      [start_date, end_date]
    );

    const itemsBreakdown = await pool.query(
      `SELECT 
         bi.item_name,
         SUM(bi.quantity) as total_quantity,
         AVG(bi.unit_price) as avg_price,
         SUM(bi.line_total) as total_sales,
         COUNT(DISTINCT b.id) as times_ordered
       FROM bill_items bi
       INNER JOIN bills b ON bi.bill_id = b.id
       WHERE b.bill_date >= $1 AND b.bill_date <= $2
       GROUP BY bi.item_name
       ORDER BY total_sales DESC`,
      [start_date, end_date]
    );

    let dailyBreakdown = [];
    if (report_type === "daily") {
      const dailyResult = await pool.query(
        `SELECT 
           b.bill_date,
           COUNT(*) as bills_count,
           SUM(b.grand_total) as daily_total,
           COUNT(DISTINCT b.table_no) as unique_tables
         FROM bills b
         WHERE b.bill_date >= $1 AND b.bill_date <= $2
         GROUP BY b.bill_date
         ORDER BY b.bill_date`,
        [start_date, end_date]
      );
      dailyBreakdown = dailyResult.rows;
    }

    const totalRevenue = parseFloat(salesSummary.rows.total_revenue);
    const paymentSummary = {
      cash: totalRevenue * 0.6,
      card: totalRevenue * 0.35,
      upi: totalRevenue * 0.05,
    };

    res.json({
      summary: {
        totalRevenue: totalRevenue,
        totalOrders: parseInt(salesSummary.rows.total_orders),
        subtotal: parseFloat(salesSummary.rows.subtotal),
        totalTax: parseFloat(salesSummary.rows.total_tax),
        daysCovered: parseInt(salesSummary.rows.days_covered),
        activeClerks: parseInt(salesSummary.rows.active_clerks),
        averageOrderValue:
          totalRevenue / parseInt(salesSummary.rows.total_orders) || 0,
      },
      itemsBreakdown: itemsBreakdown.rows.map((item) => ({
        name: item.item_name,
        quantity: parseInt(item.total_quantity),
        avgPrice: parseFloat(item.avg_price),
        totalSales: parseFloat(item.total_sales),
        timesOrdered: parseInt(item.times_ordered),
      })),
      dailyBreakdown: dailyBreakdown.map((day) => ({
        date: day.bill_date,
        billsCount: parseInt(day.bills_count),
        totalSales: parseFloat(day.daily_total),
        uniqueTables: parseInt(day.unique_tables),
      })),
      paymentSummary,
    });
  } catch (error) {
    console.error("Sales report error:", error);
    res.status(500).json({ detail: "Failed to generate sales report" });
  }
});

// GET /api/admin/reconciliation/shifts
app.get("/api/admin/reconciliation/shifts", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ detail: "date is required" });

    const shiftsResult = await pool.query(
      `SELECT 
         s.id,
         s.clerk_initials,
         s.shift_code,
         s.session_date,
         s.login_timestamp,
         s.end_timestamp,
         s.is_active,
         COUNT(b.id) as total_bills,
         COALESCE(SUM(b.grand_total), 0) as expected_cash,
         COALESCE(SUM(CASE WHEN b.grand_total > 0 THEN b.grand_total ELSE 0 END), 0) as cash_sales,
         COUNT(DISTINCT b.table_no) as tables_served
       FROM sessions s
       LEFT JOIN bills b ON s.session_id = b.session_id AND b.bill_date = s.session_date
       WHERE s.session_date = $1
       GROUP BY s.id, s.clerk_initials, s.shift_code, s.session_date, s.login_timestamp, s.end_timestamp, s.is_active
       ORDER BY s.login_timestamp`,
      [date]
    );

    res.json({
      shifts: shiftsResult.rows.map((shift) => ({
        id: shift.id,
        clerkInitials: shift.clerk_initials,
        shiftCode: shift.shift_code,
        loginTime: shift.login_timestamp,
        endTime: shift.end_timestamp,
        isActive: shift.is_active,
        totalBills: parseInt(shift.total_bills),
        expectedCash: parseFloat(shift.expected_cash),
        cashSales: parseFloat(shift.cash_sales),
        tablesServed: parseInt(shift.tables_served),
        status: shift.is_active ? "Active" : "Closed",
      })),
    });
  } catch (error) {
    console.error("Shift reconciliation error:", error);
    res.status(500).json({ detail: "Failed to fetch shift data" });
  }
});

// POST /api/admin/reconciliation/submit
app.post("/api/admin/reconciliation/submit", async (req, res) => {
  try {
    const { shift_id, actual_cash_amount, notes, reconciled_by } = req.body;
    if (!shift_id || actual_cash_amount === undefined) {
      return res
        .status(400)
        .json({ detail: "shift_id and actual_cash_amount are required" });
    }

    const shiftResult = await pool.query(
      `SELECT 
         s.*,
         COALESCE(SUM(b.grand_total), 0) as expected_cash
       FROM sessions s
       LEFT JOIN bills b ON s.session_id = b.session_id
       WHERE s.id = $1
       GROUP BY s.id`,
      [shift_id]
    );

    if (shiftResult.rows.length === 0)
      return res.status(404).json({ detail: "Shift not found" });

    const shift = shiftResult.rows;
    const expectedCash = parseFloat(shift.expected_cash);
    const actualCash = parseFloat(actual_cash_amount);
    const variance = actualCash - expectedCash;

    await pool.query(
      `INSERT INTO audit_log (
         performed_by_user_name, user_role, action_type, resource_type, resource_id,
         session_id, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        reconciled_by || "Admin",
        "admin",
        "CASH_RECONCILIATION",
        "shift",
        shift_id,
        shift.session_id,
        JSON.stringify({
          clerk_initials: shift.clerk_initials,
          shift_code: shift.shift_code,
          expected_cash: expectedCash,
          actual_cash: actualCash,
          variance: variance,
          notes: notes || "",
          reconciliation_timestamp: new Date().toISOString(),
        }),
      ]
    );

    res.json({
      success: true,
      reconciliation: {
        shiftId: shift_id,
        clerkInitials: shift.clerk_initials,
        shiftCode: shift.shift_code,
        expectedCash: expectedCash,
        actualCash: actualCash,
        variance: variance,
        varianceType:
          variance > 0 ? "surplus" : variance < 0 ? "deficit" : "exact",
        notes: notes || "",
        reconciledBy: reconciled_by || "Admin",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Cash reconciliation error:", error);
    res.status(500).json({ detail: "Failed to submit reconciliation" });
  }
});

// GET /api/admin/reconciliation/history
app.get("/api/admin/reconciliation/history", async (req, res) => {
  try {
    const { start_date, end_date, limit = 50 } = req.query;
    let query = `
      SELECT 
        timestamp_utc,
        performed_by_user_name,
        payload
      FROM audit_log
      WHERE action_type = 'CASH_RECONCILIATION'
    `;
    const params = [];

    if (start_date && end_date) {
      query += ` AND DATE(timestamp_utc) >= $1 AND DATE(timestamp_utc) <= $2`;
      params.push(start_date, end_date);
    }

    query += ` ORDER BY timestamp_utc DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      reconciliations: result.rows.map((record) => ({
        timestamp: record.timestamp_utc,
        reconciledBy: record.performed_by_user_name,
        ...record.payload,
      })),
    });
  } catch (error) {
    console.error("Reconciliation history error:", error);
    res.status(500).json({ detail: "Failed to fetch reconciliation history" });
  }
});

// GET /api/admin/analytics/trends
app.get("/api/admin/analytics/trends", async (req, res) => {
  try {
    const { period = "7d" } = req.query;
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    const trendsResult = await pool.query(
      `SELECT 
         bill_date,
         COUNT(*) as bills,
         SUM(grand_total) as sales,
         AVG(grand_total) as avg_bill_value,
         COUNT(DISTINCT table_no) as unique_tables
       FROM bills
       WHERE bill_date >= $1 AND bill_date <= $2
       GROUP BY bill_date
       ORDER BY bill_date`,
      [startDate.toISOString().split("T"), endDate.toISOString().split("T")]
    );

    const peakHoursResult = await pool.query(
      `SELECT 
         EXTRACT(HOUR FROM created_at) as hour,
         COUNT(*) as bill_count,
         AVG(grand_total) as avg_sales
       FROM bills
       WHERE bill_date >= $1 AND bill_date <= $2
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      [startDate.toISOString().split("T"), endDate.toISOString().split("T")]
    );

    res.json({
      salesTrends: trendsResult.rows.map((row) => ({
        date: row.bill_date,
        bills: parseInt(row.bills),
        sales: parseFloat(row.sales),
        avgBillValue: parseFloat(row.avg_bill_value),
        uniqueTables: parseInt(row.unique_tables),
      })),
      peakHours: peakHoursResult.rows.map((row) => ({
        hour: parseInt(row.hour),
        billCount: parseInt(row.bill_count),
        avgSales: parseFloat(row.avg_sales),
      })),
    });
  } catch (error) {
    console.error("Analytics trends error:", error);
    res.status(500).json({ detail: "Failed to fetch analytics data" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Restaurant Billing Backend with Shift Management",
    version: "2.1.0",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    detail:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    timestamp: new Date().toISOString(),
  });
});

// DB connection test
pool
  .query("SELECT NOW()")
  .then(() => console.log("✅ Database connected successfully"))
  .catch((err) => console.error("❌ Database connection failed:", err));

// Initialize today's shifts on startup
initializeTodaysShifts();

app.listen(PORT, () => {
  console.log(`🚀 Restaurant Billing Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 API Base URL: http://127.0.0.1:${PORT}/api`);
  console.log(`⏰ Shift scheduler initialized`);
});

module.exports = app;
