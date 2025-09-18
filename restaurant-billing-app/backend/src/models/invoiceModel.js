const { query } = require("../db");

class InvoiceModel {
  static async getSystemConfig() {
    const text = "SELECT * FROM system_config ORDER BY updated_at DESC LIMIT 1";
    const result = await query(text);
    return result.rows[0];
  }

  static async updateSystemConfig(updates, updatedBy) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");

    const text = `
            UPDATE system_config 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP, updated_by = $1
            WHERE id = (SELECT id FROM system_config ORDER BY updated_at DESC LIMIT 1)
            RETURNING *
        `;
    const result = await query(text, [updatedBy, ...values]);
    return result.rows[0];
  }

  static async getParcelRules() {
    const text =
      "SELECT * FROM parcel_rules WHERE is_active = true ORDER BY rule_name";
    const result = await query(text);
    return result.rows;
  }

  static async createParcelRule(ruleName, itemGroups, applicableDays) {
    const text = `
            INSERT INTO parcel_rules (rule_name, item_groups, applicable_days)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
    const result = await query(text, [ruleName, itemGroups, applicableDays]);
    return result.rows[0];
  }

  static async updateParcelRule(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");

    const text = `
            UPDATE parcel_rules 
            SET ${setClause}
            WHERE id = $1
            RETURNING *
        `;
    const result = await query(text, [id, ...values]);
    return result.rows[0];
  }

  static async deleteParcelRule(id) {
    const text =
      "UPDATE parcel_rules SET is_active = false WHERE id = $1 RETURNING *";
    const result = await query(text, [id]);
    return result.rows[0];
  }

  static async checkParcelSplitRequired(orderId, currentDay) {
    // Get order items with their groups
    const itemsText = `
            SELECT DISTINCT i.item_group
            FROM order_items oi
            JOIN items i ON oi.item_id = i.id
            WHERE oi.order_id = $1 AND oi.status = 'active'
        `;
    const itemsResult = await query(itemsText, [orderId]);
    const orderGroups = itemsResult.rows.map((row) => row.item_group);

    // Check if any parcel rule applies
    const rulesText = `
            SELECT * FROM parcel_rules 
            WHERE is_active = true 
            AND $1 = ANY(applicable_days)
        `;
    const rulesResult = await query(rulesText, [currentDay.toLowerCase()]);

    for (const rule of rulesResult.rows) {
      // Check if any rule groups match order groups
      const hasMatchingGroups = rule.item_groups.some((group) =>
        orderGroups.includes(group)
      );
      if (hasMatchingGroups) {
        return {
          shouldSplit: true,
          rule: rule,
          orderGroups: orderGroups,
        };
      }
    }

    return { shouldSplit: false };
  }

  static async generateInvoiceData(billId) {
    const bill = await TransactionModel.getBillById(billId);
    if (!bill) {
      throw new Error("Bill not found");
    }

    const invoiceData = {
      bill_number: bill.bill_number,
      date: bill.print_timestamp
        ? new Date(bill.print_timestamp).toLocaleDateString()
        : new Date().toLocaleDateString(),
      time: bill.print_timestamp
        ? new Date(bill.print_timestamp).toLocaleTimeString()
        : new Date().toLocaleTimeString(),
      hotel_name: bill.hotel_name,
      gst_number: bill.gst_number,
      items: bill.items,
      subtotal: parseFloat(bill.subtotal),
      sgst_amount: parseFloat(bill.sgst_amount),
      cgst_amount: parseFloat(bill.cgst_amount),
      total_tax: parseFloat(bill.total_tax),
      grand_total: parseFloat(bill.grand_total),
      footer_text: bill.footer_text,
    };

    return invoiceData;
  }
}

module.exports = InvoiceModel;
