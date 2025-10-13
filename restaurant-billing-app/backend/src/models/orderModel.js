const pool = require("../db");

const OrderModel = {
  async createOrder(orderData) {
    const {
      track,
      clerk_initials,
      table_no,
      party_no,
      bill_number,
      item_code,
      numeric_item_code,
      item_name,
      quantity,
      unit_price,
      line_total,
    } = orderData;

    const result = await pool.query(
      `INSERT INTO orders (track, clerk_initials, table_no, party_no, bill_number, item_code, numeric_item_code, item_name, quantity, unit_price, line_total, order_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING')
       RETURNING *`,
      [
        track,
        clerk_initials,
        table_no,
        party_no,
        bill_number,
        item_code,
        numeric_item_code,
        item_name,
        quantity,
        unit_price,
        line_total,
      ]
    );
    return result.rows[0];
  },

  async getPendingOrdersByTable(table_no) {
    const result = await pool.query(
      "SELECT * FROM orders WHERE table_no = $1 AND order_status = 'PENDING'",
      [table_no]
    );
    return result.rows;
  },

  async clearOrders(track, clerk_initials, table_no, party_no, bill_number) {
    await pool.query(
      "DELETE FROM orders WHERE track = $1 AND clerk_initials = $2 AND table_no = $3 AND party_no = $4 AND bill_number = $5",
      [track, clerk_initials, table_no, party_no, bill_number]
    );
  },
};

module.exports = OrderModel;
