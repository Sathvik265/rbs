const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000; // Changed to match beta app expectations

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for local development
});
app.use("/api/", limiter);

// CORS configuration - matches beta app expectations
app.use(
  cors({
    origin: ["http://127.0.0.1:3000", "http://localhost:3000"],
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============== AUTH ROUTES ==============
// POST /api/auth/login - Staff login with shift management
app.post("/api/auth/login", async (req, res) => {
  try {
    const { staff_code, is_root = false } = req.body;

    // Simple auth logic - matches beta expectations
    if (!staff_code) {
      return res.status(400).json({ detail: "Staff code required" });
    }

    const upperStaffCode = staff_code.toUpperCase();
    let mode = "none";

    if (upperStaffCode === "CLK") {
      mode = "clerk";
    } else if (upperStaffCode === "SHI") {
      mode = is_root ? "admin-full" : "admin-limited";
    } else {
      return res.status(401).json({ detail: "Invalid credentials" });
    }

    res.json({ mode });
  } catch (error) {
    console.error("Auth login error:", error);
    res.status(500).json({ detail: "Authentication failed" });
  }
});

// ============== MENU ROUTES ==============
// GET /api/menu - Get all menu items
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

// POST /api/menu - Add menu item (admin only)
app.post("/api/menu", async (req, res) => {
  try {
    const { name, alpha_code, numeric_code, price_fixed, price_general, price_ac, category } = req.body;

    if (!name || (!alpha_code && !numeric_code)) {
      return res.status(400).json({ detail: "Name and at least one code required" });
    }

    const result = await pool.query(
      `INSERT INTO items (name, alpha_code, numeric_code, price_fixed, price_general, price_ac, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, alpha_code?.toUpperCase(), numeric_code, 
       parseFloat(price_fixed) || 0, parseFloat(price_general) || 0, 
       parseFloat(price_ac) || 0, category]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Add menu item error:", error);
    if (error.constraint) {
      res.status(400).json({ detail: "Item code already exists" });
    } else {
      res.status(500).json({ detail: "Failed to add menu item" });
    }
  }
});

// DELETE /api/menu/:id - Delete menu item (admin only)
app.delete("/api/menu/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE items SET is_active = false WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: "Item not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Delete menu item error:", error);
    res.status(500).json({ detail: "Failed to delete menu item" });
  }
});

// GET /api/menu/lookup/:code - Lookup item by alpha or numeric code
app.get("/api/menu/lookup/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();

    const result = await pool.query(
      `SELECT * FROM items 
       WHERE (UPPER(alpha_code) = $1 OR UPPER(numeric_code) = $1) 
       AND is_active = true LIMIT 1`,
      [upperCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: "Item not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Lookup item error:", error);
    res.status(500).json({ detail: "Failed to lookup item" });
  }
});

// ============== BILLING ROUTES ==============
// GET /api/bill/next_number - Get next bill number for date
app.get("/api/bill/next_number", async (req, res) => {
  try {
    const { bill_date } = req.query;

    if (!bill_date) {
      return res.status(400).json({ detail: "bill_date is required" });
    }

    // Get the last bill number for this date
    const result = await pool.query(
      "SELECT COALESCE(MAX(bill_number), 0) as last_number FROM bills WHERE bill_date = $1",
      [bill_date]
    );

    const nextNumber = (result.rows[0]?.last_number || 0) + 1;
    res.json({ bill_number: nextNumber });
  } catch (error) {
    console.error("Get next bill number error:", error);
    res.status(500).json({ detail: "Failed to get next bill number" });
  }
});

// POST /api/bill - Create and print bill
app.post("/api/bill", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { header, item_codes, quantities, bill_date, modified_from_bill_id } = req.body;

    if (!header || !item_codes || !quantities || !bill_date) {
      await client.query('ROLLBACK');
      return res.status(400).json({ detail: "Missing required fields" });
    }

    // Get next bill number atomically
    const billNumberResult = await client.query(
      "SELECT COALESCE(MAX(bill_number), 0) + 1 as next_number FROM bills WHERE bill_date = $1",
      [bill_date]
    );
    const billNumber = billNumberResult.rows[0].next_number;

    // Create the bill items array
    const billItems = [];
    let subtotal = 0;

    for (let i = 0; i < item_codes.length; i++) {
      const code = item_codes[i];
      const quantity = quantities[i];

      // Lookup item details
      const itemResult = await client.query(
        "SELECT * FROM items WHERE (UPPER(alpha_code) = $1 OR UPPER(numeric_code) = $1) AND is_active = true",
        [code.toUpperCase()]
      );

      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ detail: `Item not found: ${code}` });
      }

      const item = itemResult.rows[0];
      let unitPrice;

      // Determine price based on section
      switch (header.section) {
        case 'AC':
          unitPrice = item.price_ac;
          break;
        case 'P':
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
        line_total: lineTotal
      });
    }

    // Calculate taxes (9% SGST + 9% CGST = 18% total)
    const sgst = subtotal * 0.025; // 2.5%
    const cgst = subtotal * 0.025; // 2.5%
    const taxAmount = sgst + cgst;
    const grandTotal = subtotal + taxAmount;

    // Insert bill
    const billResult = await client.query(
      `INSERT INTO bills (bill_number, bill_date, table_no, party_no, section, track, 
                          clerk_initials, subtotal, sgst, cgst, tax_amount, grand_total, modified_from_bill_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [billNumber, bill_date, header.table_no, header.party_no, header.section, 
       header.track, header.clerk_initials, subtotal, sgst, cgst, taxAmount, grandTotal, modified_from_bill_id]
    );

    const bill = billResult.rows[0];

    // Insert bill items
    for (const item of billItems) {
      await client.query(
        `INSERT INTO bill_items (bill_id, item_code, item_name, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bill.id, item.code, item.name, item.quantity, item.unit_price, item.line_total]
      );
    }

    // Get settings for bill printing
    const settingsResult = await client.query("SELECT * FROM settings LIMIT 1");
    const settings = settingsResult.rows[0] || {};

    await client.query('COMMIT');

    // Prepare response data for printing
    const responseData = {
      id: bill.id,
      header: {
        bill_number: billNumber,
        table_no: header.table_no,
        party_no: header.party_no,
        section: header.section
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
      gstin: settings.gstin || ""
    };

    res.json(responseData);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Create bill error:", error);
    res.status(500).json({ detail: "Failed to create bill" });
  } finally {
    client.release();
  }
});

// GET /api/bill/last - Get last bill for table and date
app.get("/api/bill/last", async (req, res) => {
  try {
    const { table_no, bill_date } = req.query;

    if (!table_no || !bill_date) {
      return res.status(400).json({ detail: "table_no and bill_date are required" });
    }

    // Get the most recent bill for this table and date
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

    if (billResult.rows.length === 0) {
      return res.status(404).json({ detail: "No previous bill found" });
    }

    const bill = billResult.rows[0];

    res.json({
      id: bill.id,
      header: {
        table_no: bill.table_no,
        party_no: bill.party_no,
        section: bill.section,
        bill_number: bill.bill_number
      },
      items: bill.items.filter(item => item.code) // Remove null items
    });

  } catch (error) {
    console.error("Get last bill error:", error);
    res.status(500).json({ detail: "Failed to get last bill" });
  }
});

// GET /api/bills/by_date - Get bills by date
app.get("/api/bills/by_date", async (req, res) => {
  try {
    const { bill_date } = req.query;

    if (!bill_date) {
      return res.status(400).json({ detail: "bill_date is required" });
    }

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

// ============== SETTINGS ROUTES ==============
// GET /api/settings - Get system settings
app.get("/api/settings", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM settings ORDER BY id LIMIT 1");
    const settings = result.rows[0] || {
      hotel_name: "Restaurant Name",
      address: "",
      phone: "",
      gstin: ""
    };
    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ detail: "Failed to get settings" });
  }
});

// PUT /api/settings - Update settings (admin only)
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

    // If no conflict, try updating the first record
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
        // Insert new record
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Restaurant Billing Backend",
    version: "2.0.0"
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    detail: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    timestamp: new Date().toISOString(),
  });
});

// Database connection test
pool.query('SELECT NOW()')
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection failed:', err));

app.listen(PORT, () => {
  console.log(`🚀 Restaurant Billing Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 API Base URL: http://127.0.0.1:${PORT}/api`);
});

module.exports = app;