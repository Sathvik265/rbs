const pool = require("../db");

const BillingModel = {
  async getAllBills() {
    const result = await pool.query(
      "SELECT * FROM bills ORDER BY created_at DESC"
    );
    return result.rows;
  },

  async createBill(data) {
    const { header, bill_date, bill_number } = data;
    const { track, clerk_initials, table_no, party_no } = header;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Calculate totals from orders table
      const totalsRes = await pool.query(
        `SELECT
           SUM(line_total) as subtotal,
           SUM(line_total) * 0.025 as sgst,
           SUM(line_total) * 0.025 as cgst,
           SUM(line_total) * 0.05 as tax_amount,
           SUM(line_total) * 1.05 as grand_total
         FROM orders
         WHERE track = $1 AND clerk_initials = $2 AND table_no = $3 AND party_no = $4 AND bill_number = $5`,
        [track, clerk_initials, table_no, party_no, bill_number]
      );
      const totals = totalsRes.rows[0];

      // Insert into bills
      const billInsert = await client.query(
        `INSERT INTO bills (track, clerk_initials, table_no, party_no, bill_number, bill_date, subtotal, sgst, cgst, tax_amount, grand_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          track,
          clerk_initials,
          table_no,
          party_no,
          bill_number,
          bill_date,
          totals.subtotal,
          totals.sgst,
          totals.cgst,
          totals.tax_amount,
          totals.grand_total,
        ]
      );
      const billId = billInsert.rows[0].id;

      // Move orders to bill_items
      await client.query(
        `INSERT INTO bill_items (bill_id, track, clerk_initials, table_no, party_no, bill_number, item_code, numeric_item_code, item_name, quantity, unit_price, line_total)
         SELECT $1, track, clerk_initials, table_no, party_no, bill_number, item_code, numeric_item_code, item_name, quantity, unit_price, line_total
         FROM orders
         WHERE track = $2 AND clerk_initials = $3 AND table_no = $4 AND party_no = $5 AND bill_number = $6`,
        [billId, track, clerk_initials, table_no, party_no, bill_number]
      );

      // Delete from orders
      await client.query(
        "DELETE FROM orders WHERE track = $1 AND clerk_initials = $2 AND table_no = $3 AND party_no = $4 AND bill_number = $5",
        [track, clerk_initials, table_no, party_no, bill_number]
      );

      await client.query("COMMIT");
      return {
        bill_id: billId,
        bill_number,
        ...totals,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async getNextBillNumber(bill_date) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const r = await client.query(
        "SELECT last_number FROM bill_sequences WHERE bill_date = $1 FOR UPDATE",
        [bill_date]
      );
      let nextBillNumber;
      if (r.rows.length === 0) {
        await client.query(
          "INSERT INTO bill_sequences (bill_date, last_number) VALUES ($1, 1)",
          [bill_date]
        );
        nextBillNumber = 1;
      } else {
        const lastNumber = Number(r.rows[0].last_number) || 0;
        nextBillNumber = lastNumber + 1;
        await client.query(
          "UPDATE bill_sequences SET last_number = $1 WHERE bill_date = $2",
          [nextBillNumber, bill_date]
        );
      }
      await client.query("COMMIT");
      return { bill_number: nextBillNumber };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
};

module.exports = BillingModel;
