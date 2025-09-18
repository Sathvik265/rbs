const { query, transaction } = require("../db");

class TransactionModel {
  static async createBill(
    orderId,
    sessionId,
    subtotal,
    sgstAmount,
    cgstAmount,
    hotelName,
    gstNumber,
    footerText
  ) {
    const totalTax = sgstAmount + cgstAmount;
    const grandTotal = subtotal + totalTax;

    const text = `
            INSERT INTO bills (
                order_id, session_id, subtotal, sgst_amount, cgst_amount, 
                total_tax, grand_total, hotel_name, gst_number, footer_text
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

    const result = await query(text, [
      orderId,
      sessionId,
      subtotal,
      sgstAmount,
      cgstAmount,
      totalTax,
      grandTotal,
      hotelName,
      gstNumber,
      footerText,
    ]);

    return result.rows[0];
  }

  static async assignBillNumberAndPrint(billId) {
    return await transaction(async (client) => {
      // Get next bill number atomically
      const billNumberResult = await client.query(
        "SELECT get_next_bill_number() as bill_number"
      );
      const billNumber = billNumberResult.rows[0].bill_number;

      // Update bill with number and print timestamp
      const updateText = `
                UPDATE bills 
                SET bill_number = $1, 
                    print_timestamp = CURRENT_TIMESTAMP,
                    is_printed = true
                WHERE id = $2
                RETURNING *
            `;
      const billResult = await client.query(updateText, [billNumber, billId]);

      if (!billResult.rows[0]) {
        throw new Error("Bill not found");
      }

      const bill = billResult.rows[0];

      // Get order items and create bill items snapshot
      const itemsText = `
                SELECT 
                    oi.quantity,
                    oi.unit_price,
                    oi.line_total,
                    i.item_code,
                    i.item_name
                FROM order_items oi
                JOIN items i ON oi.item_id = i.id
                WHERE oi.order_id = $1 AND oi.status = 'active'
                ORDER BY oi.created_at
            `;
      const itemsResult = await client.query(itemsText, [bill.order_id]);

      // Insert bill items
      for (const item of itemsResult.rows) {
        const billItemText = `
                    INSERT INTO bill_items (
                        bill_id, item_code, item_name, quantity, unit_price, line_total
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                `;
        await client.query(billItemText, [
          bill.id,
          item.item_code,
          item.item_name,
          item.quantity,
          item.unit_price,
          item.line_total,
        ]);
      }

      // Update order status to billed
      await client.query("UPDATE orders SET status = $1 WHERE id = $2", [
        "billed",
        bill.order_id,
      ]);

      return {
        ...bill,
        bill_number: billNumber,
        items: itemsResult.rows,
      };
    });
  }

  static async getBillById(billId) {
    const text = `
            SELECT 
                b.*,
                bi.item_code,
                bi.item_name,
                bi.quantity,
                bi.unit_price,
                bi.line_total
            FROM bills b
            LEFT JOIN bill_items bi ON b.id = bi.bill_id
            WHERE b.id = $1
            ORDER BY bi.id
        `;
    const result = await query(text, [billId]);

    if (result.rows.length === 0) {
      return null;
    }

    const bill = {
      id: result.rows[0].id,
      bill_number: result.rows[0].bill_number,
      order_id: result.rows[0].order_id,
      session_id: result.rows[0].session_id,
      subtotal: result.rows[0].subtotal,
      sgst_amount: result.rows[0].sgst_amount,
      cgst_amount: result.rows[0].cgst_amount,
      total_tax: result.rows[0].total_tax,
      grand_total: result.rows[0].grand_total,
      print_timestamp: result.rows[0].print_timestamp,
      is_printed: result.rows[0].is_printed,
      hotel_name: result.rows[0].hotel_name,
      gst_number: result.rows[0].gst_number,
      footer_text: result.rows[0].footer_text,
      created_at: result.rows[0].created_at,
      items: result.rows
        .filter((row) => row.item_code)
        .map((row) => ({
          item_code: row.item_code,
          item_name: row.item_name,
          quantity: row.quantity,
          unit_price: row.unit_price,
          line_total: row.line_total,
        })),
    };

    return bill;
  }

  static async getBillByNumber(billNumber) {
    const text = "SELECT * FROM bills WHERE bill_number = $1";
    const result = await query(text, [billNumber]);

    if (!result.rows[0]) {
      return null;
    }

    return await this.getBillById(result.rows[0].id);
  }

  static async getBillsBySession(sessionId) {
    const text = `
            SELECT * FROM bills 
            WHERE session_id = $1 
            ORDER BY print_timestamp DESC
        `;
    const result = await query(text, [sessionId]);
    return result.rows;
  }

  static async getBillsByDateRange(startDate, endDate) {
    const text = `
            SELECT 
                b.*,
                s.clerk_initials,
                s.shift_code
            FROM bills b
            JOIN sessions s ON b.session_id = s.id
            WHERE DATE(b.print_timestamp) BETWEEN $1 AND $2
            AND b.is_printed = true
            ORDER BY b.bill_number
        `;
    const result = await query(text, [startDate, endDate]);
    return result.rows;
  }

  static async getDailySummary(date) {
    const text = `
            SELECT 
                COUNT(*) as total_bills,
                SUM(subtotal) as total_subtotal,
                SUM(sgst_amount) as total_sgst,
                SUM(cgst_amount) as total_cgst,
                SUM(grand_total) as total_amount,
                MIN(bill_number) as first_bill,
                MAX(bill_number) as last_bill
            FROM bills 
            WHERE DATE(print_timestamp) = $1
            AND is_printed = true
        `;
    const result = await query(text, [date]);
    return result.rows[0];
  }
}

module.exports = TransactionModel;
