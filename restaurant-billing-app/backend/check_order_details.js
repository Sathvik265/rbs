const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkOrders() {
    const client = await pool.connect();
    try {
        console.log("Checking recent orders...");
        const res = await client.query(`
            SELECT id, item_name, item_code, numeric_item_code, table_no 
            FROM orders 
            ORDER BY id DESC 
            LIMIT 5;
        `);
        console.table(res.rows);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkOrders();
