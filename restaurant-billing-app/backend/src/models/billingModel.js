const pool = require("../db");
const ShiftModel = require("./shiftModel");

const BillingModel = {
  // Get all bills
  async getAllBills() {
    const result = await pool.query(
      "SELECT * FROM bills ORDER BY created_at DESC"
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
      [billNumber, billDate]
    );
    return result.rows[0];
  },

  // Get bill items from JSON
  async getBillItems(billId) {
    const result = await pool.query(
      "SELECT items_json FROM bills WHERE id = $1",
      [billId]
    );
    if (result.rows.length > 0 && result.rows[0].items_json) {
      return result.rows[0].items_json;
    }
    return [];
  },

  // Get next bill number for a track based on current shift session
  async getNextBillNumber(track) {
    // 1. Get current open session for the track (shift)
    const session = await ShiftModel.getCurrentOpenSession(track);

    if (!session) {
      throw new Error(
        `No open shift session found for track: ${track}. Cannot generate bill number.`
      );
    }

    // 2. Count bills created during this session
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM bills 
       WHERE track = $1 
       AND created_at >= $2`,
      [track, session.start_time]
    );

    const count = parseInt(result.rows[0].count);
    return count + 1;
  },

  async createBill(data) {
    const {
      bill_date,
      table_no,
      party_no = "1",
      section,
      track,
      clerk_initials,
      subtotal,
      sgst,
      cgst,
      tax_amount,
      grand_total,
      order_id = null,
    } = data;

    const client = await pool.connect();
    try {
      // Generate dynamic bill number
      const bill_number = await this.getNextBillNumber(track);

      await client.query("BEGIN");

      // 1. Insert the bill record first (without items_json initially)
      const billInsertRes = await client.query(
        `INSERT INTO bills (
          bill_number, bill_date, table_no, party_no, section, 
          track, clerk_initials, subtotal, sgst, cgst, 
          tax_amount, grand_total, items_json, order_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, '[]'::jsonb, $13)
        RETURNING id`,
        [
          bill_number,
          bill_date,
          parseInt(table_no), // Ensure table_no is integer
          party_no,
          section,
          track,
          clerk_initials,
          subtotal,
          sgst,
          cgst,
          tax_amount,
          grand_total,
          order_id,
        ]
      );
      const billId = billInsertRes.rows[0].id;

      // 2. Call the stored procedure to move orders to bill items_json
      // This function also handles the deletion of orders
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
        message: "Bill created successfully",
      };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error in createBill transaction:", err);
      throw err;
    } finally {
      client.release();
    }
  },

  async getLastBillNumber(date) {
    const result = await pool.query(
      "SELECT MAX(bill_number) as last_bill_number FROM bills WHERE bill_date = $1",
      [date]
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
      [startDate, endDate]
    );
    return result.rows;
  },

  // Get bills by table
  async getBillsByTable(tableNo) {
    const result = await pool.query(
      "SELECT * FROM bills WHERE table_no = $1 ORDER BY created_at DESC LIMIT 50",
      [tableNo]
    );
    return result.rows;
  },

  // Ensure holding bill (Bill #0) exists for the date
  async ensureHoldingBill(date) {
    const client = await pool.connect();
    try {
      const check = await client.query(
        "SELECT id FROM bills WHERE bill_number = 0 AND bill_date = $1",
        [date]
      );
      if (check.rows.length === 0) {
        await client.query(
          `INSERT INTO bills (
            bill_number, bill_date, table_no, party_no, section, 
            track, clerk_initials, subtotal, sgst, cgst, 
            tax_amount, grand_total, items_json
          ) VALUES (0, $1, NULL, '0', 'SYS', 'SYS', 'SYS', 0, 0, 0, 0, 0, '[]'::jsonb)
          ON CONFLICT (bill_number, bill_date) DO NOTHING`,
          [date]
        );
      }
    } finally {
      client.release();
    }
  },
};

module.exports = BillingModel;
