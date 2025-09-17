const pool = require('../db');

const ShiftModel = {
    async startShift(clerkId) {
        const result = await pool.query(
            'INSERT INTO shifts (clerk_id, is_active) VALUES ($1, TRUE) RETURNING *',
            [clerkId]
        );
        return result.rows[0];
    },
    async endShift(shiftId) {
        const result = await pool.query(
            'UPDATE shifts SET is_active = FALSE, end_time = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [shiftId]
        );
        return result.rows[0];
    },
};

module.exports = ShiftModel;