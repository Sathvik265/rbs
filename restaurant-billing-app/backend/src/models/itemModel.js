const pool = require("../db");

const ItemModel = {
  // Get all items
  async getAllItems() {
    const result = await pool.query(
      "SELECT * FROM items ORDER BY category, name"
    );
    return result.rows;
  },

  // Get item by ID
  async getItemById(id) {
    const result = await pool.query("SELECT * FROM items WHERE id = $1", [id]);
    return result.rows[0];
  },

  // Get item by code
  async getItemByCode(code) {
    const result = await pool.query(
      "SELECT * FROM items WHERE alpha_code = $1 OR numeric_code = $1",
      [code]
    );
    return result.rows[0];
  },

  // Create new item
  async createItem(itemData) {
    const {
      name,
      alpha_code,
      numeric_code,
      price_fixed,
      price_general,
      price_ac,
      category,
      is_separate = false,
    } = itemData;

    const result = await pool.query(
      `INSERT INTO items (
        name, alpha_code, numeric_code, price_fixed, 
        price_general, price_ac, category, is_separate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        name,
        alpha_code,
        numeric_code,
        price_fixed,
        price_general,
        price_ac,
        category,
        is_separate,
      ]
    );
    return result.rows[0];
  },

  // Update item
  async updateItem(id, itemData) {
    const {
      name,
      alpha_code,
      numeric_code,
      price_fixed,
      price_general,
      price_ac,
      category,
      is_separate,
    } = itemData;

    const result = await pool.query(
      `UPDATE items 
       SET name = $1, alpha_code = $2, numeric_code = $3,
           price_fixed = $4, price_general = $5, price_ac = $6,
           category = $7, is_separate = $8
       WHERE id = $9
       RETURNING *`,
      [
        name,
        alpha_code,
        numeric_code,
        price_fixed,
        price_general,
        price_ac,
        category,
        is_separate,
        id,
      ]
    );
    return result.rows[0];
  },

  // Delete item
  async deleteItem(id) {
    await pool.query("DELETE FROM items WHERE id = $1", [id]);
  },

  // Get items by category
  async getItemsByCategory(category) {
    const result = await pool.query(
      "SELECT * FROM items WHERE category = $1 ORDER BY name",
      [category]
    );
    return result.rows;
  },

  // Get separate items
  async getSeparateItems() {
    const result = await pool.query(
      "SELECT * FROM items WHERE is_separate = true ORDER BY name"
    );
    return result.rows;
  },

  // Get regular items
  async getRegularItems() {
    const result = await pool.query(
      "SELECT * FROM items WHERE is_separate = false ORDER BY category, name"
    );
    return result.rows;
  },

  // Search items
  async searchItems(searchTerm) {
    const result = await pool.query(
      `SELECT * FROM items 
       WHERE name ILIKE $1 
          OR alpha_code ILIKE $1 
          OR numeric_code ILIKE $1
          OR category ILIKE $1
       ORDER BY name`,
      [`%${searchTerm}%`]
    );
    return result.rows;
  },
};

module.exports = ItemModel;
