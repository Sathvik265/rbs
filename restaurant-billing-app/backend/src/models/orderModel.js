const pool = require("../db");

const OrderModel = {
  // Create a new order
  async createOrder(orderData) {
    const {
      track,
      clerk_initials,
      table_no,
      party_no = "1",
      bill_number,
      item_code,
      numeric_item_code,
      item_name,
      quantity,
      unit_price,
      line_total,
    } = orderData;

    const result = await pool.query(
      `INSERT INTO orders (
        track, clerk_initials, table_no, party_no, bill_number,
        item_code, numeric_item_code, item_name, quantity, unit_price, line_total
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

  // Get pending orders by table and party
  async getPendingOrdersByTableAndParty(table_no, party_no) {
    const result = await pool.query(
      "SELECT * FROM orders WHERE table_no = $1 AND party_no = $2 ORDER BY created_at",
      [table_no, party_no]
    );
    return result.rows;
  },

  // Get pending orders by table
  async getPendingOrdersByTable(table_no) {
    const result = await pool.query(
      "SELECT * FROM orders WHERE table_no = $1 ORDER BY party_no, created_at",
      [table_no]
    );
    return result.rows;
  },

  // Get all pending orders
  async getAllPendingOrders() {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY table_no, party_no, created_at"
    );
    return result.rows;
  },

  // Clear orders for a table/party
  async clearOrders(table_no, party_no) {
    await pool.query(
      "DELETE FROM orders WHERE table_no = $1 AND party_no = $2",
      [table_no, party_no]
    );
  },

  // Delete a specific order
  async deleteOrder(orderId) {
    await pool.query("DELETE FROM orders WHERE id = $1", [orderId]);
  },

  // Update order quantity
  async updateOrderQuantity(orderId, newQuantity, newLineTotal) {
    const result = await pool.query(
      `UPDATE orders 
       SET quantity = $1, line_total = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [newQuantity, newLineTotal, orderId]
    );
    return result.rows[0];
  },

  // Get order by ID
  async getOrderById(orderId) {
    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    return result.rows[0];
  },

  // Get total for pending orders
  async getOrdersTotal(table_no, party_no) {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(line_total), 0) as total,
        COUNT(*) as item_count
       FROM orders 
       WHERE table_no = $1 AND party_no = $2`,
      [table_no, party_no]
    );
    return result.rows[0];
  },

  // Get orders by track and clerk
  async getOrdersByTrackAndClerk(track, clerk_initials) {
    const result = await pool.query(
      "SELECT * FROM orders WHERE track = $1 AND clerk_initials = $2 ORDER BY created_at DESC",
      [track, clerk_initials]
    );
    return result.rows;
  },
};

module.exports = OrderModel;
