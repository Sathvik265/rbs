// Updated billing model for the new database schema
// Removed session_id, shift_id, modified_from_bill_id dependencies
// Works with the new merged shift_sessions table

const pool = require("../db");

function toIntOrNull(v) {
  // Treat null/undefined/empty-string as null (do not coerce to 0)
  if (v === null || v === undefined || v === "") return null;
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
      bill_date,
      grand_total,
      subtotal,
      sgst,
      cgst,
      tax_amount,
      track, // used to identify shift type
    } = data || {};

    // `items` may be provided in data or built below from item_codes
    let items = data && Array.isArray(data.items) ? data.items : [];

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
    let subtotal_num = toNumOrZero(subtotal);
    let sgst_num = toNumOrZero(sgst);
    let cgst_num = toNumOrZero(cgst);
    let tax_amount_num = toNumOrZero(tax_amount);
    let grand_total_num = toNumOrZero(grand_total);

    if (!bill_date) {
      throw new Error("bill_date is required");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get or advance bill number per bill_date (FOR UPDATE)
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
        const lastNumber = Number(seq.rows[0].last_number) || 0;
        nextBillNumber = lastNumber + 1;
        await client.query(
          "UPDATE bill_sequences SET last_number = $1 WHERE bill_date = $2",
          [nextBillNumber, bill_date]
        );
      }

      // Create or get shift session for the clerk and track
      let shift_session_id = null;
      if (clerk_initials && hdr_track) {
        // First, try to find an existing open shift session
        const existingSession = await client.query(
          `SELECT shift_session_id FROM shift_sessions 
                     WHERE clerk_initials = $1 AND shift_name = $2 AND session_date = $3 
                     AND status = 'OPEN' ORDER BY start_time DESC LIMIT 1`,
          [clerk_initials, hdr_track, bill_date]
        );

        if (existingSession.rows.length > 0) {
          shift_session_id = existingSession.rows[0].shift_session_id;
        } else {
          // Create a new shift session for this clerk and track
          const newSession = await client.query(
            `INSERT INTO shift_sessions (shift_name, clerk_initials, session_date, status)
                         VALUES ($1, $2, $3, 'OPEN') 
                         ON CONFLICT (shift_name, session_date, clerk_initials) 
                         DO UPDATE SET status = 'OPEN', start_time = CURRENT_TIMESTAMP
                         RETURNING shift_session_id`,
            [hdr_track, clerk_initials, bill_date]
          );
          shift_session_id = newSession.rows[0].shift_session_id;
        }
      }

      // If frontend sent item_codes + quantities (legacy payload), build the
      // full items[] here by looking up item details from `items` table
      const { item_codes = [], quantities = [] } = data || {};
      if (
        Array.isArray(items) &&
        items.length === 0 &&
        Array.isArray(item_codes) &&
        item_codes.length > 0
      ) {
        const built = [];
        let runningSubtotal = 0;

        for (let i = 0; i < item_codes.length; i++) {
          const code = item_codes[i];
          const qty = Number(quantities && quantities[i]) || 1;

          // lookup by alpha_code or numeric_code
          const itemRes = await client.query(
            `SELECT id, name, alpha_code, numeric_code, price_fixed, price_general, price_ac
                         FROM items WHERE UPPER(alpha_code) = UPPER($1) OR numeric_code = $1 LIMIT 1`,
            [code]
          );

          let unit_price = 0;
          let name = code;
          let codeOut = code;

          if (itemRes.rows.length > 0) {
            const r = itemRes.rows[0];
            name = r.name || name;
            codeOut = r.alpha_code || r.numeric_code || codeOut;
            unit_price = Number(r.price_fixed) || Number(r.price_general) || 0;
          }

          const line_total = Number(unit_price) * Number(qty || 0);
          runningSubtotal += Number(line_total);

          built.push({
            code: codeOut,
            name,
            quantity: qty,
            unit_price,
            line_total,
          });
        }

        items = built;
        // Override computed totals
        subtotal_num = runningSubtotal;
        grand_total_num =
          runningSubtotal + toNumOrZero(sgst) + toNumOrZero(cgst);
      }

      console.log("DEBUG: Creating bill with:", {
        nextBillNumber,
        bill_date,
        table_no_int,
        party_no_int,
        section,
        hdr_track,
        clerk_initials,
        subtotal_num,
        sgst_num,
        cgst_num,
        tax_amount_num,
        grand_total_num,
        shift_session_id,
      });

      // Insert into bills (simplified - removed session_id, shift_id, modified_from_bill_id, updated_at)
      const billInsert = await client.query(
        `INSERT INTO bills (
                    bill_number, bill_date, table_no, party_no, section, track,
                    clerk_initials, subtotal, sgst, cgst, tax_amount, grand_total
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10, $11, $12
                )
                RETURNING id, created_at`,
        [
          nextBillNumber,
          bill_date,
          table_no_int,
          party_no_int,
          section,
          hdr_track,
          clerk_initials,
          subtotal_num,
          sgst_num,
          cgst_num,
          tax_amount_num,
          grand_total_num,
        ]
      );

      const billId = billInsert.rows[0].id;
      const createdAt = billInsert.rows[0].created_at;

      // Insert bill items
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

      // Build printable structure expected by frontend
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
          shift_session_id,
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
      `SELECT b.*,
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
             LIMIT 1`,
      [toIntOrNull(table_no), bill_date]
    );

    if (res.rows.length === 0) return null;

    const b = res.rows[0];
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
      `SELECT b.id, b.bill_number, b.table_no, b.party_no, b.grand_total, b.created_at,
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
             ORDER BY b.bill_number DESC`,
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
