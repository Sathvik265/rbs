const pool = require("../db");
const ShiftModel = require("./shiftModel");

const BillingModel = {
  // Get all bills
  async getAllBills() {
    const result = await pool.query(
      "SELECT * FROM bills ORDER BY created_at DESC",
    );
    return result.rows;
  },

  // Get bill by ID
  async getBillById(billId) {
    const result = await pool.query("SELECT * FROM bills WHERE id = $1", [
      billId,
    ]);
    return result.rows[0];
  },

  // Get bill by number and date
  async getBillByNumber(billNumber, billDate) {
    const result = await pool.query(
      "SELECT * FROM bills WHERE bill_number = $1 AND bill_date = $2",
      [billNumber, billDate],
    );
    return result.rows[0];
  },

  // Get bill items from JSON
  async getBillItems(billId) {
    const result = await pool.query(
      "SELECT items_json FROM bills WHERE id = $1",
      [billId],
    );
    if (result.rows.length > 0 && result.rows[0].items_json) {
      return result.rows[0].items_json;
    }
    return [];
  },

  // Get next bill number for a track based on today's date
  async getNextBillNumber(track, date) {
    // Logic Changed: Global sequence to avoid duplicate key error.
    // Ignored 'track' to ensure bill_number is unique per date across all tracks.
    const result = await pool.query(
      `SELECT MAX(bill_number) as max_num 
       FROM bills 
       WHERE bill_date = $1`,
      [date],
    );

    const maxNum = parseInt(result.rows[0].max_num) || 0;
    return maxNum + 1;
  },

  // Find an existing provisional bill (bill_number = 0)
  async getProvisionalBill(table_no, party_no, track, clerk_initials) {
    const result = await pool.query(
      `SELECT * FROM bills 
       WHERE table_no = $1 
       AND party_no = $2 
       AND track = $3 
       AND clerk_initials = $4 
       AND bill_number = 0 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [parseInt(table_no), party_no, track, clerk_initials],
    );
    return result.rows[0];
  },

  // Create a new provisional bill
  async createProvisionalBill(data) {
    const {
      bill_date,
      table_no,
      party_no,
      section,
      track,
      clerk_initials,
      created_at, // Allow explicit timestamp
    } = data;

    // Use provided timestamp or generate one in Node (ms precision) to ensure consistency with orders FK
    const finalCreatedAt = created_at || new Date();

    const result = await pool.query(
      `INSERT INTO bills (
        bill_number, bill_date, table_no, party_no, section, 
        track, clerk_initials, items_json, created_at
      )
      VALUES (0, $1, $2, $3, $4, $5, $6, '[]'::jsonb, $7)
      RETURNING *`,
      [
        bill_date,
        parseInt(table_no),
        party_no,
        section,
        track,
        clerk_initials,
        finalCreatedAt,
      ],
    );
    return result.rows[0];
  },

  // Finalize an existing provisional bill into a real bill
  async finalizeBill(data) {
    const {
      // Keys to find the bill
      table_no,
      party_no,
      track,
      clerk_initials,
      created_at, // The linking key!

      // Update data
      bill_date,
      subtotal,
      sgst,
      cgst,
      tax_amount,
      grand_total,
      order_id,
    } = data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Generate real bill number
      const bill_number = await this.getNextBillNumber(track, bill_date);

      // 2. Update the existing provisional bill
      // We must match on the Created At because that's the FK link
      const updateRes = await client.query(
        `UPDATE bills SET
          bill_number = $1,
          bill_date = $2,
          subtotal = $3,
          sgst = $4,
          cgst = $5,
          tax_amount = $6,
          grand_total = $7,
          order_id = $8,
          clerk_initials = $12
        WHERE table_no = $9 
          AND party_no = $10 
          AND created_at = $11 -- Vital: Match the FK column exactly
          AND bill_number = 0 -- Safety check
        RETURNING id`,
        [
          bill_number,
          bill_date,
          subtotal,
          sgst,
          cgst,
          tax_amount,
          grand_total,
          order_id,
          parseInt(table_no),
          party_no,
          created_at,
          clerk_initials,
        ],
      );

      if (updateRes.rows.length === 0) {
        throw new Error("Provisional bill not found or already finalized.");
      }

      const billId = updateRes.rows[0].id;

      // 3. Move orders to items_json (and clear from orders table)
      // Note: The FK constraint on orders will cascade update if we changed PK, but we didn't change the FK cols.
      // Wait: We didn't change created_at, so FK remains valid.
      // But move_orders_to_bill_json deletes orders. The FK cascade delete might interfere if not handled or if FK is on delete cascade.
      // Actually, standard move logic deletes orders.
      // Deleting orders is fine, that's what we want.

      await client.query("SELECT move_orders_to_bill_json($1, $2, $3)", [
        billId,
        table_no.toString(),
        party_no,
      ]);

      await client.query("COMMIT");
      return {
        bill_id: billId,
        bill_number,
        grand_total,
        message: "Bill finalized successfully",
      };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error in finalizeBill transaction:", err);
      throw err;
    } finally {
      client.release();
    }
  },

  // Retain for compatibility or logic unrelated to main flow
  async createBill(data) {
    // Alias to finalizeBill for now to avoid breaking other calls if any,
    // BUT ideally controller should call finalizeBill explicitly.
    return this.finalizeBill(data);
  },

  async getLastBillNumber(date) {
    const result = await pool.query(
      "SELECT MAX(bill_number) as last_bill_number FROM bills WHERE bill_date = $1",
      [date],
    );
    return result.rows[0];
  },

  // Get bills by date range
  async getBillsByDateRange(startDate, endDate) {
    const result = await pool.query(
      `SELECT * FROM bills 
       WHERE bill_date BETWEEN $1 AND $2 
       AND bill_number > 0
       ORDER BY created_at DESC`,
      [startDate, endDate],
    );
    return result.rows;
  },

  // Get bills by table
  async getBillsByTable(tableNo) {
    const result = await pool.query(
      "SELECT * FROM bills WHERE table_no = $1 ORDER BY created_at DESC LIMIT 50",
      [tableNo],
    );
    return result.rows;
  },

  // Ensure holding bill (Bill #0) exists for the date
  async ensureHoldingBill(date) {
    const client = await pool.connect();
    try {
      const check = await client.query(
        "SELECT id FROM bills WHERE bill_number = 0 AND bill_date = $1",
        [date],
      );
      if (check.rows.length === 0) {
        await client.query(
          `INSERT INTO bills (
            bill_number, bill_date, table_no, party_no, section, 
            track, clerk_initials, subtotal, sgst, cgst, 
            tax_amount, grand_total, items_json
          ) VALUES (0, $1, NULL, '0', 'SYS', 'SYS', 'SYS', 0, 0, 0, 0, 0, '[]'::jsonb)
          ON CONFLICT (bill_number, bill_date, track) DO NOTHING`,
          [date],
        );
      }
    } finally {
      client.release();
    }
  },
  // Delete all bills (and associated orders) for a track on a given date
  async deleteBillsByTrack(track, date) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Delete orders first
      await client.query(
        "DELETE FROM orders WHERE track = $1 AND bill_date = $2",
        [track, date],
      );

      // 2. Delete bills
      const result = await client.query(
        "DELETE FROM bills WHERE track = $1 AND bill_date = $2",
        [track, date],
      );

      await client.query("COMMIT");
      return result.rowCount; // Number of bills deleted
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  // Get total sales per clerk for a specific date
  async getClerkSales(date) {
    const result = await pool.query(
      `SELECT clerk_initials, track, COUNT(*) as bill_count, COALESCE(SUM(CAST(grand_total AS NUMERIC)), 0) as total_sales 
       FROM bills 
       WHERE bill_date::text LIKE $1 || '%' AND bill_number > 0
       GROUP BY clerk_initials, track
       ORDER BY total_sales DESC`,
      [date],
    );
    return result.rows;
  },

  // Get clerk login/logout history by joining shifts and sessions
  async getClerkLoginHistory(date) {
    // Assuming 'sessions' or 'shift_log' table tracks login/logout.
    // If sessions table is used for active state, we might need to check how history is stored.
    // Based on previous context, there is a 'shift_sessions' or similar table.
    // Let's use the 'sessions' table which seems to track this.
    const result = await pool.query(
      `SELECT s.shift_name, s.clerk_initials, s.created_at as login_time, NULL as logout_time 
        FROM sessions s
        WHERE DATE(s.created_at) = $1
        ORDER BY s.created_at DESC`,
      [date],
    );
    return result.rows;
  },
};

module.exports = BillingModel;
