const pool = require("../db");

const BillingModel = {
  async getAllBills() {
    const result = await pool.query(
      "SELECT * FROM bills ORDER BY created_at DESC"
    );
    return result.rows;
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
    } = data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insert into bills table with data from frontend
      const billInsertRes = await client.query(
        `INSERT INTO bills (bill_number, bill_date, table_no, party_no, section, track, clerk_initials, subtotal, sgst, cgst, tax_amount, grand_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        ]
      );
      const billId = billInsertRes.rows[0].id;

      // Insert each item into the bill_items table
      for (const item of items) {
        await client.query(
          `INSERT INTO bill_items (bill_id, item_code, item_name, quantity, unit_price, line_total, track, clerk_initials, table_no, party_no, bill_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            billId,
            item.item_code || item.alpha_code || item.numeric_code,
            item.item_name || item.name,
            item.quantity,
            item.unit_price || item.price,
            item.line_total,
            track,
            clerk_initials,
            table_no,
            party_no,
            bill_number,
          ]
        );
      }

      await client.query("COMMIT");
      return {
        bill_id: billId,
        bill_number,
        grand_total,
        detail: "Bill created successfully",
      };
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Error in createBill transaction:", err);
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
