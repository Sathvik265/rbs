const pool = require('../db');

const BillingModel = {
    async getAllBills() {
        const result = await pool.query('SELECT * FROM bills');
        return result.rows;
    },
    async createBill(data) {
        const { customer_name, total_amount, items, date } = data;
        const result = await pool.query(
            'INSERT INTO bills (customer_name, total_amount, items, date) VALUES ($1, $2, $3, $4) RETURNING *',
            [customer_name, total_amount, items, date]
        );
        return result.rows[0];
    },
};

module.exports = BillingModel;