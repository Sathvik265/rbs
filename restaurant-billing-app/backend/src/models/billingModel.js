// models/billingModel.js
const pool = require("../db");

function toIntOrNull(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function toNumOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const BillingModel = {
  async getAllBills() {
    const result = await pool.query(
      "SELECT * FROM bills ORDER BY bill_date DESC, bill_number DESC"
    );
    return result.rows;
  },

  async createBill(data) {
    const {
      header = {},
      items = [],
      bill_date,
      grand_total,
      session_id,
      subtotal,
      sgst,
      cgst,
      tax_amount,
      track, // may be provided from client; used to resolve shift if needed
    } = data || {};

    // Normalize header fields from various client shapes
    const table_no =
      header.table_no !== undefined ? header.table_no : header.tableno;
    const party_no =
      header.party_no !== undefined ? header.party_no : header.partyno;
    const section = header.section ?? null;
    const clerk_initials =
      header.clerk_initials !== undefined
        ? header.clerk_initials
        : header.clerkinitials ?? null;
    const hdr_track = header.track ?? track ?? null;

    // Coerce all possibly-numeric values safely to avoid NaN into SQL
    const table_no_int = toIntOrNull(table_no);
    const party_no_int = toIntOrNull(party_no);
    const session_id_int = toIntOrNull(session_id);
    const subtotal_num = toNumOrZero(subtotal);
    const sgst_num = toNumOrZero(sgst);
    const cgst_num = toNumOrZero(cgst);
    const tax_amount_num = toNumOrZero(tax_amount);
    const grand_total_num = toNumOrZero(grand_total);

    if (!bill_date) {
      throw new Error("bill_date is required");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get or advance bill number per bill_date
      const seq = await client.query(
        "SELECT last_number FROM bill_sequences WHERE bill_date = $1 FOR UPDATE",
        [bill_date]
      );

      let nextBillNumber;
      if (seq.rows.length === 0) {
        await client.query(
          "INSERT INTO bill_sequences (bill_date, last_number) VALUES ($1, 1)",
          [bill_date]
        );
        nextBillNumber = 1;
      } else {
        nextBillNumber = Number(seq.rows.last_number) + 1;
        await client.query(
          "UPDATE bill_sequences SET last_number = $1 WHERE bill_date = $2",
          [nextBillNumber, bill_date]
        );
      }

      // Resolve shift_id if possible
      let shift_id = null;

      // If a valid numeric session_id was provided, try to use its shift
      if (session_id_int !== null) {
        const sessionRes = await client.query(
          "SELECT shift_id, shift_code, session_date FROM sessions WHERE session_id = $1",
          [session_id_int]
        );
        if (sessionRes.rows.length > 0) {
          const s = sessionRes.rows;
          if (s.shift_id) {
            shift_id = s.shift_id;
          } else if (s.shift_code && s.session_date) {
            const shiftRes = await client.query(
              "SELECT shift_id FROM shifts WHERE shift_name = $1 AND date = $2",
              [s.shift_code, s.session_date]
            );
            if (shiftRes.rows.length > 0) {
              shift_id = shiftRes.rows.shift_id;
              await client.query(
                "UPDATE sessions SET shift_id = $1 WHERE session_id = $2",
                [shift_id, session_id_int]
              );
            }
          }
        }
      }

      // If still null, try to resolve using track on the bill date
      if (shift_id === null && hdr_track) {
        const shiftRes = await client.query(
          "SELECT shift_id FROM shifts WHERE shift_name = $1 AND date = $2 AND status = 'OPEN' LIMIT 1",
          [hdr_track, bill_date]
        );
        if (shiftRes.rows.length > 0) {
          shift_id = shiftRes.rows.shift_id;
        }
      }

      // Insert into bills (ensure no NaN reaches SQL)
      const billInsert = await client.query(
        `INSERT INTO bills (
           bill_number, bill_date, table_no, party_no, section, track,
           clerk_initials, subtotal, sgst, cgst, tax_amount, grand_total,
           session_id, shift_id
         ) VALUES (
           $1,$2,$3,$4,$5,$6,
           $7,$8,$9,$10,$11,$12,
           $13,$14
         )
         RETURNING id, created_at`,
        [
          nextBillNumber,
          bill_date,
          table_no_int, // nullable int
          party_no_int, // nullable int
          section, // text
          hdr_track, // text
          clerk_initials, // text
          subtotal_num, // numeric defaulted to 0
          sgst_num, // numeric defaulted to 0
          cgst_num, // numeric defaulted to 0
          tax_amount_num, // numeric defaulted to 0
          grand_total_num, // numeric defaulted to 0
          session_id_int, // nullable int
          shift_id, // nullable int
        ]
      );

      const billId = billInsert.rows.id;
      const createdAt = billInsert.rows.created_at;

      // Insert bill items (protect against NaN)
      if (Array.isArray(items)) {
        for (const it of items) {
          const code =
            it.code !== undefined
              ? it.code
              : it.item_code !== undefined
              ? it.item_code
              : null;
          const name =
            it.name !== undefined
              ? it.name
              : it.item_name !== undefined
              ? it.item_name
              : "";
          const quantity =
            it.qty !== undefined
              ? toIntOrNull(it.qty)
              : toIntOrNull(it.quantity);
          const unit_price =
            it.rate !== undefined
              ? toNumOrZero(it.rate)
              : toNumOrZero(it.unit_price);
          // If line_total not provided or invalid, compute safely
          let line_total =
            it.amount !== undefined
              ? toNumOrZero(it.amount)
              : toNumOrZero(it.line_total);
          if (!Number.isFinite(line_total) || line_total === 0) {
            line_total = toNumOrZero(
              (quantity === null ? 0 : quantity) * unit_price
            );
          }

          await client.query(
            `INSERT INTO bill_items (bill_id, item_code, item_name, quantity, unit_price, line_total)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [billId, code, name, quantity, unit_price, line_total]
          );
        }
      }

      // Build printable structure expected by frontend printing
      const itemsRes = await client.query(
        `SELECT
           item_code AS code,
           item_name AS name,
           quantity,
           unit_price,
           line_total
         FROM bill_items
         WHERE bill_id = $1
         ORDER BY id`,
        [billId]
      );

      await client.query("COMMIT");

      return {
        bill_id: billId,
        bill_number: nextBillNumber,
        header: {
          billnumber: nextBillNumber,
          tableno: table_no_int,
          partyno: party_no_int,
          section,
          track: hdr_track,
          clerkinitials: clerk_initials,
          billdate: bill_date,
        },
        items: itemsRes.rows,
        totals: {
          subtotal: subtotal_num,
          sgst: sgst_num,
          cgst: cgst_num,
          taxamount: tax_amount_num,
          grandtotal: grand_total_num,
        },
        meta: {
          session_id: session_id_int,
          shift_id,
          created_at: createdAt,
        },
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async getLastBill(table_no, bill_date) {
    const res = await pool.query(
      `
      SELECT b.*,
             COALESCE(json_agg(
               json_build_object(
                 'code', bi.item_code,
                 'name', bi.item_name,
                 'quantity', bi.quantity,
                 'unit_price', bi.unit_price,
                 'line_total', bi.line_total
               )
               ORDER BY bi.id
             ) FILTER (WHERE bi.id IS NOT NULL), '[]'::json) AS items
      FROM bills b
      LEFT JOIN bill_items bi ON bi.bill_id = b.id
      WHERE b.table_no = $1 AND b.bill_date = $2
      GROUP BY b.id
      ORDER BY b.bill_number DESC
      LIMIT 1
      `,
      [toIntOrNull(table_no), bill_date]
    );

    if (res.rows.length === 0) return null;

    const b = res.rows;
    return {
      id: b.id,
      header: {
        tableno: b.table_no,
        partyno: b.party_no,
        section: b.section,
        billnumber: b.bill_number,
        billdate: b.bill_date,
      },
      items: b.items || [],
      totals: {
        subtotal: b.subtotal,
        sgst: b.sgst,
        cgst: b.cgst,
        taxamount: b.tax_amount,
        grandtotal: b.grand_total,
      },
    };
  },

  async getBillsByDate(bill_date) {
    const result = await pool.query(
      `
      SELECT b.id, b.bill_number, b.table_no, b.party_no, b.grand_total, b.created_at,
             COALESCE(json_agg(
               json_build_object(
                 'name', bi.item_name,
                 'quantity', bi.quantity,
                 'unit_price', bi.unit_price,
                 'line_total', bi.line_total
               )
               ORDER BY bi.id
             ) FILTER (WHERE bi.id IS NOT NULL), '[]'::json) AS items
      FROM bills b
      LEFT JOIN bill_items bi ON bi.bill_id = b.id
      WHERE b.bill_date = $1
      GROUP BY b.id
      ORDER BY b.bill_number DESC
      `,
      [bill_date]
    );
    return result.rows;
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
        nextBillNumber = Number(r.rows.last_number) + 1;
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
