const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./db");
require("dotenv").config();
require("./services/scheduler"); // Initialize shift scheduler

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

// ================= AUTH ROUTES =================
// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { staff_code: initials, date, track, is_root = false } = req.body;
    if (!initials || !date || !track) {
      return res
        .status(400)
        .json({ detail: "Initials, date, and track are required" });
    }

    const upperStaffCode = initials.toUpperCase();
    let mode = "none";
    if (upperStaffCode === "CLK") mode = "clerk";
    else if (upperStaffCode === "SHI")
      mode = is_root ? "admin-full" : "admin-limited";
    else return res.status(401).json({ detail: "Invalid credentials" });

    // Ensure shifts for the date exist before trying to find one
    const shiftsToEnsure = ['`', '``', 'RBS1', 'RBS2'];
    for (const shiftName of shiftsToEnsure) {
        await pool.query(
            `INSERT INTO shifts (shift_name, date, status) VALUES ($1, $2, 'OPEN') ON CONFLICT (shift_name, date) DO NOTHING`,
            [shiftName, date]
        );
    }

    // Find the shift
    const shiftResult = await pool.query(
      "SELECT shift_id FROM shifts WHERE shift_name = $1 AND date = $2 AND status = 'OPEN'",
      [track, date]
    );

    if (shiftResult.rows.length === 0) {
      return res.status(400).json({ detail: "No open shift found for the given track and date." });
    }
    const shift_id = shiftResult.rows[0].shift_id;

    // Create a session
    const sessionResult = await pool.query(
      "INSERT INTO sessions (clerk_initials, shift_code, session_date) VALUES ($1, $2, $3) RETURNING session_id",
      [initials, track, date]
    );
    const session_id = sessionResult.rows[0].session_id;

    res.json({ mode, session_id, shift_id });
  } catch (error) {
    console.error("Auth login error:", error);
    res.status(500).json({ detail: "Authentication failed" });
  }
});

// ================= MENU ROUTES =================
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
    res.json(result.rows[0]);
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
    res.json(result.rows[0]);
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
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Lookup item error:", error);
    res.status(500).json({ detail: "Failed to lookup item" });
  }
});

const billingRoutes = require('./routes/billingRoutes');
app.use('/api/bill', billingRoutes);



// ================= SETTINGS ROUTES =================
// GET /api/settings
app.get("/api/settings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM settings ORDER BY id LIMIT 1"
    );
    const settings = result.rows[0] || {
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
        return res.json(insertResult.rows[0]);
      }
      return res.json(updateResult.rows[0]);
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ detail: "Failed to update settings" });
  }
});

// ================= ADMIN MODULE ENHANCEMENTS =================

// GET /api/admin/dashboard
app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
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
    const billsCount = salesResult.rows[0].total_bills;
    res.json({
      totalSales: parseFloat(salesResult.rows[0].total_sales),
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
    const totalRevenue = parseFloat(salesSummary.rows[0].total_revenue);
    const paymentSummary = {
      cash: totalRevenue * 0.6,
      card: totalRevenue * 0.35,
      upi: totalRevenue * 0.05,
    };
    res.json({
      summary: {
        totalRevenue: totalRevenue,
        totalOrders: parseInt(salesSummary.rows[0].total_orders),
        subtotal: parseFloat(salesSummary.rows[0].subtotal),
        totalTax: parseFloat(salesSummary.rows[0].total_tax),
        daysCovered: parseInt(salesSummary.rows[0].days_covered),
        activeClerks: parseInt(salesSummary.rows[0].active_clerks),
        averageOrderValue:
          totalRevenue / parseInt(salesSummary.rows[0].total_orders) || 0,
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
    const shift = shiftResult.rows[0];
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
      [
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
      ]
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
      [
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
      ]
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

const reportRoutes = require('./routes/reportRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reconciliationRoutes = require('./routes/reconciliationRoutes');

app.use('/api/shifts', shiftRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reconciliation', reconciliationRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Restaurant Billing Backend",
    version: "2.0.0",
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

app.listen(PORT, () => {
  console.log(`🚀 Restaurant Billing Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 API Base URL: http://127.0.0.1:${PORT}/api`);
});

module.exports = app;
