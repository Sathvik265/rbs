// Updated app.js for the new database schema
// Modified authentication and related functionality to work with shift_sessions table

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./db");
require("dotenv").config();
require("./services/scheduler"); // Initialize shift scheduler (if still needed)

// Create app before using app.use(...)
const app = express();
const PORT = process.env.PORT || 8000;

// Add these imports after creating app (single import set)
const billingRoutes = require("./routes/billingRoutes");
const shiftRoutes = require("./routes/shiftRoutes");
const itemRoutes = require("./routes/itemRoutes");
const tableRoutes = require("./routes/tableRoutes");
const reportRoutes = require("./routes/reportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reconciliationRoutes = require("./routes/reconciliationRoutes");
const reportController = require("./controllers/reportController");
const SettingsModel = require("./models/settingsModel");

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

// ================ ROUTES (centralized) ================
app.use("/api/billing", billingRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reconciliation", reconciliationRoutes);

// Simple settings endpoints for admin UI
app.get("/api/settings/clerks", reportController.getClerks);
app.get("/api/settings", reportController.getSettings);
app.put("/api/settings", reportController.updateSettings);

// ================ AUTH ROUTES (UPDATED) ================
// POST /api/auth/login - Updated for shift_sessions table
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log("Auth login request body:", req.body);
    const { staff_code: initials, date, track, is_root = false } = req.body;

    // Normalize initials to uppercase for DB consistency
    const upperStaffCode = initials ? String(initials).toUpperCase() : null;

    if (!initials || !date || !track) {
      return res.status(400).json({
        detail: "Initials, date, and track are required",
      });
    }

    let mode = "none";

    if (upperStaffCode === "CLK") mode = "clerk";
    else if (upperStaffCode === "SHI")
      mode = is_root ? "admin-full" : "admin-limited";
    else return res.status(401).json({ detail: "Invalid credentials" });

    // IMPORTANT: If the requested track/shift for the given date is CLOSED,
    // do not allow login for any user on that track.
    console.log(`Checking closed status for Track: ${track}, Date: ${date}`);
    const closedCheck = await pool.query(
      `SELECT 1 FROM sessions WHERE shift_name = $1 AND session_date = $2::date AND UPPER(status) = 'CLOSED' LIMIT 1`,
      [track, date]
    );
    console.log(`Closed Check Result:`, closedCheck.rows);

    if (closedCheck.rows.length > 0) {
      return res
        .status(403)
        .json({ detail: "Shift is closed for this track/date" });
    }

    // Find an existing open session for this clerk
    let shiftSessionResult = await pool.query(
      `SELECT session_id FROM sessions 
             WHERE shift_name = $1 AND session_date = $2 AND clerk_initials = $3 AND status = 'OPEN'`,
      [track, date, upperStaffCode]
    );

    let shift_session_id;

    if (shiftSessionResult.rows.length === 0) {
      // Create a new shift session for this clerk (do NOT force-open existing closed sessions)
      const createResult = await pool.query(
        `INSERT INTO sessions (shift_name, clerk_initials, session_date, status, start_time)
     VALUES ($1, $2, $3, 'OPEN', CURRENT_TIMESTAMP)
     ON CONFLICT (shift_name, session_date, clerk_initials)
     DO NOTHING
     RETURNING session_id`,
        [track, upperStaffCode, date]
      );

      if (createResult.rows.length > 0) {
        shift_session_id = createResult.rows[0].session_id;
      } else {
        // Conflict happened but no row returned (existing row present). Try to fetch it again.
        const retry = await pool.query(
          `SELECT session_id FROM sessions WHERE shift_name = $1 AND session_date = $2 AND clerk_initials = $3 AND status = 'OPEN'`,
          [track, date, upperStaffCode]
        );
        if (retry.rows.length > 0) shift_session_id = retry.rows[0].session_id;
        else
          return res
            .status(409)
            .json({ detail: "Unable to create/open session for clerk" });
      }
    } else {
      shift_session_id = shiftSessionResult.rows[0].session_id;
    }

    // Ensure settings exist for this clerk (Auto-provisioning)
    await SettingsModel.ensureSettings(upperStaffCode);

    res.json({
      mode,
      shift_session_id,
      session_id: shift_session_id, // For backward compatibility
    });
  } catch (error) {
    console.error("Auth login error:", error);
    res.status(500).json({ detail: "Authentication failed" });
  }
});

// ================ MENU ROUTES (UNCHANGED) ================
// GET /api/menu - all menu items
app.get("/api/menu", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM items ORDER BY category, name"
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
      "DELETE FROM items WHERE id = $1 RETURNING *",
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

// PUT /api/menu/:id - update menu item
app.put("/api/menu/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      alpha_code,
      numeric_code,
      price_fixed,
      price_general,
      price_ac,
      category,
      is_active,
    } = req.body;

    if (!name || (!alpha_code && !numeric_code)) {
      return res.status(400).json({ detail: "Name and code required" });
    }

    const result = await pool.query(
      `UPDATE items SET
                name = $1,
                alpha_code = $2,
                numeric_code = $3,
                price_fixed = $4,
                price_general = $5,
                price_ac = $6,
                category = $7
             WHERE id = $8
             RETURNING *`,
      [
        name,
        alpha_code ? alpha_code.toUpperCase() : null,
        numeric_code,
        parseFloat(price_fixed) || 0,
        parseFloat(price_general) || 0,
        parseFloat(price_ac) || 0,
        category,
        id,
      ]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ detail: "Item not found" });
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update menu item error:", error);
    if (error.constraint)
      return res.status(400).json({ detail: "Item code already exists" });
    res.status(500).json({ detail: "Failed to update menu item" });
  }
});

// GET /api/menu/lookup/:code
app.get("/api/menu/lookup/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();
    const result = await pool.query(
      `SELECT * FROM items 
             WHERE (UPPER(alpha_code) = $1 OR UPPER(numeric_code) = $1) LIMIT 1`,
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

// ================ ADMIN MODULE ENHANCEMENTS (UPDATED) ================
// GET /api/admin/dashboard - Updated for new schema
app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const salesResult = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) as total_sales, COUNT(*) as total_bills 
             FROM bills WHERE bill_date = $1`,
      [today]
    );

    const tablesResult = await pool.query(
      `SELECT DISTINCT table_no FROM bills 
             WHERE bill_date = $1 AND created_at >= $2`,
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Restaurant Billing Backend",
    version: "2.1.0",
    schema_version: "Updated with merged shift_sessions table",
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

const server = app.listen(PORT, () => {
  console.log(`🚀 Restaurant Billing Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 API Base URL: http://127.0.0.1:${PORT}/api`);
  console.log(`📋 Schema: Updated with merged shift_sessions table`);
});

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is already in use. Stop the process using this port or set a different PORT environment variable.`
    );
    console.error(
      `You can free the port (PowerShell): netstat -ano | findstr :${PORT} ; taskkill /PID <pid> /F  OR Stop-Process -Id <pid> -Force`
    );
    process.exit(1);
  } else {
    console.error("Server error:", err);
    process.exit(1);
  }
});

module.exports = app;
