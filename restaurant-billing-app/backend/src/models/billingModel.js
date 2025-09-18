const { query, transaction } = require("../db");

class BillingModel {
  static async createOrder(sessionId, tableNumber, partyNumber) {
    const text = `
            INSERT INTO orders (session_id, table_number, party_number)
            VALUES ($1, $2, $3)
            ON CONFLICT (session_id, table_number, party_number)
            DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
    const result = await query(text, [sessionId, tableNumber, partyNumber]);
    return result.rows[0];
  }

  static async findOrder(sessionId, tableNumber, partyNumber) {
    const text = `
            SELECT * FROM orders 
            WHERE session_id = $1 
            AND table_number = $2 
            AND party_number = $3
            AND status = 'active'
        `;
    const result = await query(text, [sessionId, tableNumber, partyNumber]);
    return result.rows[0];
  }

  static async getOrderById(orderId) {
    const text = "SELECT * FROM orders WHERE id = $1";
    const result = await query(text, [orderId]);
    return result.rows[0];
  }

  static async addOrderItem(orderId, itemId, quantity, unitPrice) {
    const lineTotal = quantity * unitPrice;
    const text = `
            INSERT INTO order_items (order_id, item_id, quantity, unit_price, line_total)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
    const result = await query(text, [
      orderId,
      itemId,
      quantity,
      unitPrice,
      lineTotal,
    ]);
    return result.rows[0];
  }

  static async updateOrderItem(orderItemId, quantity) {
    // First get the current item to calculate new line total
    const getCurrentText = "SELECT unit_price FROM order_items WHERE id = $1";
    const currentResult = await query(getCurrentText, [orderItemId]);

    if (!currentResult.rows[0]) {
      throw new Error("Order item not found");
    }

    const unitPrice = currentResult.rows[0].unit_price;
    const lineTotal = quantity * unitPrice;

    const text = `
            UPDATE order_items 
            SET quantity = $1, line_total = $2
            WHERE id = $3 AND status = 'active'
            RETURNING *
        `;
    const result = await query(text, [quantity, lineTotal, orderItemId]);
    return result.rows[0];
  }

  static async cancelOrderItem(orderItemId, cancelledBy, reason = null) {
    const text = `
            UPDATE order_items 
            SET status = 'cancelled', 
                cancelled_by = $2, 
                cancelled_at = CURRENT_TIMESTAMP,
                cancellation_reason = $3
            WHERE id = $1 AND status = 'active'
            RETURNING *
        `;
    const result = await query(text, [orderItemId, cancelledBy, reason]);
    return result.rows[0];
  }

  static async getOrderItems(orderId) {
    const text = `
            SELECT 
                oi.*,
                i.item_code,
                i.item_name,
                i.category,
                i.item_group
            FROM order_items oi
            JOIN items i ON oi.item_id = i.id
            WHERE oi.order_id = $1
            ORDER BY oi.created_at
        `;
    const result = await query(text, [orderId]);
    return result.rows;
  }

  static async getOrderWithItems(orderId) {
    const orderText = "SELECT * FROM orders WHERE id = $1";
    const orderResult = await query(orderText, [orderId]);

    if (!orderResult.rows[0]) {
      return null;
    }

    const order = orderResult.rows[0];
    const items = await this.getOrderItems(orderId);

    return {
      ...order,
      items: items,
    };
  }

  static async getActiveOrders(sessionId) {
    const text = `
            SELECT DISTINCT
                o.id,
                o.table_number,
                o.party_number,
                o.created_at,
                o.updated_at,
                COUNT(oi.id) as item_count,
                SUM(CASE WHEN oi.status = 'active' THEN oi.line_total ELSE 0 END) as total_amount
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.session_id = $1 AND o.status = 'active'
            GROUP BY o.id, o.table_number, o.party_number, o.created_at, o.updated_at
            ORDER BY o.table_number, o.party_number
        `;
    const result = await query(text, [sessionId]);
    return result.rows;
  }

  static async getOrdersByTable(sessionId, tableNumber) {
    const text = `
            SELECT * FROM orders 
            WHERE session_id = $1 
            AND table_number = $2 
            AND status = 'active'
            ORDER BY party_number
        `;
    const result = await query(text, [sessionId, tableNumber]);
    return result.rows;
  }

  static async calculateOrderTotal(orderId) {
    const text = `
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'active' THEN line_total ELSE 0 END), 0) as subtotal,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_items,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_items
            FROM order_items
            WHERE order_id = $1
        `;
    const result = await query(text, [orderId]);
    return result.rows[0];
  }
}

module.exports = BillingModel;
