const { query, transaction } = require("../db");

class ShiftModel {
  static async createSession(
    clerkInitials,
    shiftCode,
    sessionDate,
    terminalId = null
  ) {
    const text = `
            INSERT INTO sessions (clerk_initials, shift_code, session_date, terminal_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
    const result = await query(text, [
      clerkInitials.toUpperCase(),
      shiftCode,
      sessionDate,
      terminalId,
    ]);
    return result.rows[0];
  }

  static async findActiveSession(clerkInitials, shiftCode, sessionDate) {
    const text = `
            SELECT * FROM sessions 
            WHERE clerk_initials = $1 
            AND shift_code = $2 
            AND session_date = $3 
            AND is_active = true
            ORDER BY login_timestamp DESC
            LIMIT 1
        `;
    const result = await query(text, [
      clerkInitials.toUpperCase(),
      shiftCode,
      sessionDate,
    ]);
    return result.rows[0];
  }

  static async endSession(sessionId) {
    const text = `
            UPDATE sessions 
            SET is_active = false, end_timestamp = CURRENT_TIMESTAMP
            WHERE id = $1 AND is_active = true
            RETURNING *
        `;
    const result = await query(text, [sessionId]);
    return result.rows[0];
  }

  static async getSessionById(sessionId) {
    const text = "SELECT * FROM sessions WHERE id = $1";
    const result = await query(text, [sessionId]);
    return result.rows[0];
  }

  static async getSessionSummary(sessionId) {
    const text = `
            SELECT 
                s.*,
                COUNT(DISTINCT b.id) as total_bills,
                COALESCE(SUM(b.grand_total), 0) as total_amount,
                COUNT(DISTINCT CASE WHEN oi.status = 'cancelled' THEN oi.id END) as cancelled_items,
                COALESCE(SUM(CASE WHEN oi.status = 'cancelled' THEN oi.line_total ELSE 0 END), 0) as cancelled_amount
            FROM sessions s
            LEFT JOIN bills b ON s.id = b.session_id
            LEFT JOIN orders o ON s.id = o.session_id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE s.id = $1
            GROUP BY s.id
        `;
    const result = await query(text, [sessionId]);
    return result.rows[0];
  }

  static async getAllSessions(limit = 50, offset = 0) {
    const text = `
            SELECT 
                s.*,
                COUNT(DISTINCT b.id) as total_bills,
                COALESCE(SUM(b.grand_total), 0) as total_amount
            FROM sessions s
            LEFT JOIN bills b ON s.id = b.session_id
            GROUP BY s.id
            ORDER BY s.login_timestamp DESC
            LIMIT $1 OFFSET $2
        `;
    const result = await query(text, [limit, offset]);
    return result.rows;
  }

  static async getSessionsByDateRange(startDate, endDate) {
    const text = `
            SELECT 
                s.*,
                COUNT(DISTINCT b.id) as total_bills,
                COALESCE(SUM(b.grand_total), 0) as total_amount
            FROM sessions s
            LEFT JOIN bills b ON s.id = b.session_id
            WHERE s.session_date BETWEEN $1 AND $2
            GROUP BY s.id
            ORDER BY s.session_date DESC, s.login_timestamp DESC
        `;
    const result = await query(text, [startDate, endDate]);
    return result.rows;
  }
}

module.exports = ShiftModel;
