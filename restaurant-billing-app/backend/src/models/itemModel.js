const { query } = require("../db");

class ItemModel {
  static async createItem(
    itemCode,
    itemName,
    unitPrice,
    category = null,
    itemGroup = "regular"
  ) {
    const text = `
            INSERT INTO items (item_code, item_name, unit_price, category, item_group)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
    const result = await query(text, [
      itemCode.toUpperCase(),
      itemName,
      unitPrice,
      category,
      itemGroup,
    ]);
    return result.rows[0];
  }

  static async findByCode(itemCode) {
    const text =
      "SELECT * FROM items WHERE item_code = $1 AND is_active = true";
    const result = await query(text, [itemCode.toUpperCase()]);
    return result.rows[0];
  }

  static async findById(itemId) {
    const text = "SELECT * FROM items WHERE id = $1 AND is_active = true";
    const result = await query(text, [itemId]);
    return result.rows[0];
  }

  static async searchItems(searchTerm, limit = 20) {
    const text = `
            SELECT * FROM items 
            WHERE is_active = true
            AND (
                LOWER(item_name) LIKE LOWER($1)
                OR LOWER(item_code) LIKE LOWER($1)
                OR LOWER(category) LIKE LOWER($1)
            )
            ORDER BY item_name
            LIMIT $2
        `;
    const searchPattern = `%${searchTerm}%`;
    const result = await query(text, [searchPattern, limit]);
    return result.rows;
  }

  static async getAllItems(limit = 100, offset = 0) {
    const text = `
            SELECT * FROM items 
            WHERE is_active = true
            ORDER BY category, item_name
            LIMIT $1 OFFSET $2
        `;
    const result = await query(text, [limit, offset]);
    return result.rows;
  }

  static async getItemsByCategory(category) {
    const text = `
            SELECT * FROM items 
            WHERE category = $1 AND is_active = true
            ORDER BY item_name
        `;
    const result = await query(text, [category]);
    return result.rows;
  }

  static async getItemsByGroup(itemGroup) {
    const text = `
            SELECT * FROM items 
            WHERE item_group = $1 AND is_active = true
            ORDER BY item_name
        `;
    const result = await query(text, [itemGroup]);
    return result.rows;
  }

  static async updateItem(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");

    const text = `
            UPDATE items 
            SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 
            RETURNING *
        `;
    const result = await query(text, [id, ...values]);
    return result.rows[0];
  }

  static async deleteItem(id) {
    const text = "UPDATE items SET is_active = false WHERE id = $1 RETURNING *";
    const result = await query(text, [id]);
    return result.rows[0];
  }

  static async getCategories() {
    const text = `
            SELECT DISTINCT category
            FROM items 
            WHERE is_active = true AND category IS NOT NULL
            ORDER BY category
        `;
    const result = await query(text);
    return result.rows.map((row) => row.category);
  }

  static async getItemGroups() {
    const text = `
            SELECT DISTINCT item_group
            FROM items 
            WHERE is_active = true
            ORDER BY item_group
        `;
    const result = await query(text);
    return result.rows.map((row) => row.item_group);
  }
}

module.exports = ItemModel;
