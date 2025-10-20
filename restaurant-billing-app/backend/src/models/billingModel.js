const pool = require("../db");

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

  async createBill(data) {
    const {
      bill_number,
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
      items = [],
      order_id = null,
    } = data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const items_json = items.map((item) => ({
        item_name: item.item_name || item.name,
        item_code_numeric: item.numeric_item_code || item.numeric_code || "",
        item_code_alpha: item.item_code || item.alpha_code || "",
        quantity: item.quantity,
        fixed_price: item.unit_price || item.price,
        actual_price: item.unit_price || item.price,
        line_total: item.line_total,
      }));

      const billInsertRes = await client.query(
        `INSERT INTO bills (
          bill_number, bill_date, table_no, party_no, section, 
          track, clerk_initials, subtotal, sgst, cgst, 
          tax_amount, grand_total, items_json, order_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          bill_number,
          bill_date,
          table_no,
          party_no,
          section,
          track,
          clerk_initials,
          subtotal,
          sgst,
          cgst,
          tax_amount,
          grand_total,
          JSON.stringify(items_json),
          order_id,
        ]
      );
      const billId = billInsertRes.rows[0].id;

      await client.query(
        `DELETE FROM orders WHERE table_no = $1 AND party_no = $2`,
        [table_no, party_no]
      );

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
       ORDER BY bill_date DESC, bill_number DESC`,
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
};

module.exports = BillingModel;
