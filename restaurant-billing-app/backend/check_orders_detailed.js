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
        console.log("--- Checking Orders Table (Detailed) ---");
        const res = await client.query(`
            SELECT id, 
                   '"' || table_no || '"' as table_quoted, 
                   '"' || party_no || '"' as party_quoted,
                   item_name, item_code, numeric_item_code 
            FROM orders 
            ORDER BY id DESC LIMIT 10
        `);

        if (res.rows.length === 0) {
            console.log("No orders found.");
        } else {
            console.table(res.rows);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkOrders();
