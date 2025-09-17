const pool = require('../db');

const ItemModel = {
    async getAllItems() {
        const result = await pool.query('SELECT * FROM items');
        return result.rows;
    },
    async createItem(name, code) {
        const result = await pool.query(
            'INSERT INTO items (name, code) VALUES ($1, $2) RETURNING *',
            [name, code]
        );
        return result.rows[0];
    },
};

module.exports = ItemModel;