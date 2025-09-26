const pool = require("../db");

const BillingModel = {
  async getAllBills() {
    const result = await pool.query(
      "SELECT * FROM bills ORDER BY bill_date DESC, bill_number DESC"
    );
    return result.rows;
  },

  async createBill(data) {
    const { header, items, bill_date, grand_total, session_id } = data;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Get next bill number
      const nextBillNumberResult = await client.query(
        "SELECT last_number FROM bill_sequences WHERE bill_date = $1 FOR UPDATE",
        [bill_date]
      );

      let nextBillNumber;
      if (nextBillNumberResult.rows.length === 0) {
        await client.query(
          "INSERT INTO bill_sequences (bill_date, last_number) VALUES ($1, 1)",
          [bill_date]
        );
        nextBillNumber = 1;
      } else {
        nextBillNumber = nextBillNumberResult.rows[0].last_number + 1;
        await client.query(
          "UPDATE bill_sequences SET last_number = $1 WHERE bill_date = $2",
          [nextBillNumber, bill_date]
        );
      }

      // Get shift_id for the current session and date
      let shift_id = null;
      if (session_id) {
        // First try to get shift_id directly from sessions table
        const sessionResult = await client.query(
          "SELECT shift_id, shift_code, session_date FROM sessions WHERE session_id = $1",
          [session_id]
        );

        if (sessionResult.rows.length > 0) {
          const session = sessionResult.rows[0];

          if (session.shift_id) {
            // If session already has shift_id, use it
            shift_id = session.shift_id;
          } else {
            // Otherwise, get the corresponding shift
            const shiftResult = await client.query(
              "SELECT shift_id FROM shifts WHERE shift_name = $1 AND date = $2",
              [session.shift_code, session.session_date]
            );

            if (shiftResult.rows.length > 0) {
              shift_id = shiftResult.rows[0].shift_id;
              // Update the session with the shift_id for future use
              await client.query(
                "UPDATE sessions SET shift_id = $1 WHERE session_id = $2",
                [shift_id, session_id]
              );
            }
          }
        }
      }

      // If no shift found, try to get current open shift for the track
      if (!shift_id && header.track) {
        const currentShiftResult = await client.query(
          "SELECT shift_id FROM shifts WHERE shift_name = $1 AND date = $2 AND status = 'OPEN' LIMIT 1",
          [header.track, bill_date]
        );

        if (currentShiftResult.rows.length > 0) {
          shift_id = currentShiftResult.rows[0].shift_id;
        }
      }

      // Insert the bill
      const billResult = await client.query(
        `
        INSERT INTO bills (
          bill_number, bill_date, table_no, party_no, section, track,
          clerk_initials, subtotal, sgst, cgst, tax_amount, grand_total,
          session_id, shift_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id`,
        [
          nextBillNumber,
          bill_date,
          header.table_no,
          header.party_no,
          header.section,
          header.track,
          header.clerk_initials,
          data.subtotal,
          data.sgst,
          data.cgst,
          data.tax_amount,
          grand_total,
          session_id,
          shift_id,
        ]
      );

      const billId = billResult.rows[0].id;

      // Insert bill items
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `
            INSERT INTO bill_items (bill_id, item_code, item_name, quantity, unit_price, line_total)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              billId,
              item.code || item.item_code,
              item.name || item.item_name,
              item.qty || item.quantity,
              item.rate || item.unit_price,
              item.amount || item.line_total,
            ]
          );
        }
      }

      await client.query("COMMIT");
      console.log(`Bill created successfully with number: ${nextBillNumber}`);
      return { bill_number: nextBillNumber, bill_id: billId };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Bill creation error:", error);
      throw error;
    } finally {
      client.release();
    }
  },

  async getLastBill(table_no, bill_date) {
    const billResult = await pool.query(
      `
      SELECT b.*, array_agg(
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
      return null;
    }

    const bill = billResult.rows[0];
    return {
      id: bill.id,
      header: {
        table_no: bill.table_no,
        party_no: bill.party_no,
        section: bill.section,
        bill_number: bill.bill_number,
      },
      items: bill.items.filter((item) => item.code),
    };
  },

  async getBillsByDate(bill_date) {
    const result = await pool.query(
      `
      SELECT b.id, b.bill_number, b.table_no, b.party_no, b.grand_total, b.created_at,
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
    return result.rows;
  },

  async getNextBillNumber(bill_date) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        "SELECT last_number FROM bill_sequences WHERE bill_date = $1 FOR UPDATE",
        [bill_date]
      );

      let nextBillNumber;
      if (result.rows.length === 0) {
        await client.query(
          "INSERT INTO bill_sequences (bill_date, last_number) VALUES ($1, 1)",
          [bill_date]
        );
        nextBillNumber = 1;
      } else {
        nextBillNumber = result.rows[0].last_number + 1;
      }

      await client.query("COMMIT");
      return { bill_number: nextBillNumber };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = BillingModel;
