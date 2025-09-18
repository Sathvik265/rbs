const { query } = require("../db");

class UserModel {
  static async createUser(initials, role = "clerk") {
    const text =
      "INSERT INTO users (initials, role) VALUES ($1, $2) RETURNING *";
    const result = await query(text, [initials.toUpperCase(), role]);
    return result.rows[0];
  }

  static async findByInitials(initials) {
    const text = "SELECT * FROM users WHERE initials = $1 AND is_active = true";
    const result = await query(text, [initials.toUpperCase()]);
    return result.rows[0];
  }

  static async getAllUsers() {
    const text = "SELECT * FROM users WHERE is_active = true ORDER BY initials";
    const result = await query(text);
    return result.rows;
  }

  static async updateUser(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");

    const text = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await query(text, [id, ...values]);
    return result.rows[0];
  }

  static async deleteUser(id) {
    const text = "UPDATE users SET is_active = false WHERE id = $1 RETURNING *";
    const result = await query(text, [id]);
    return result.rows[0];
  }
}

module.exports = UserModel;
