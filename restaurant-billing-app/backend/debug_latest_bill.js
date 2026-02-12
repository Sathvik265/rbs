const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkLatestBill() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id, bill_number, items_json FROM bills ORDER BY id DESC LIMIT 1');
        if (res.rows.length > 0) {
            const bill = res.rows[0];
            console.log(`Latest Bill ID: ${bill.id}, Number: ${bill.bill_number}`);
            console.log('Items JSON sample:', JSON.stringify(bill.items_json, null, 2));
        } else {
            console.log('No bills found.');
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkLatestBill();
