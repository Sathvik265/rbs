const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkLatestBillItems() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT items_json FROM bills ORDER BY id DESC LIMIT 1');
        if (res.rows.length > 0) {
            const items = res.rows[0].items_json;
            console.log("Latest Bill Items Check:");
            items.forEach((item, index) => {
                console.log(`Item ${index + 1}: ${item.item_name} | is_separate: ${item.is_separate} | Alpha: ${item.item_code_alpha} | Numeric: ${item.item_code_numeric}`);
            });
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkLatestBillItems();
