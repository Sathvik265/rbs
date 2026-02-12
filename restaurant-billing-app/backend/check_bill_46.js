const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkBill() {
    const client = await pool.connect();
    try {
        console.log("--- Checking Bill 46 (Latest) ---");
        // Get the latest bill just in case it's not 46, but user logs suggest 46
        const latestRes = await client.query('SELECT id FROM bills ORDER BY id DESC LIMIT 1');
        const id = latestRes.rows[0].id;

        const res = await client.query(`
            SELECT id, bill_number, items_json 
            FROM bills 
            WHERE id = $1
        `, [id]);

        if (res.rows.length === 0) {
            console.log(`Bill ${id} not found.`);
        } else {
            const bill = res.rows[0];
            console.log(`Bill ID: ${bill.id}, Number: ${bill.bill_number}`);
            console.log("Items JSON:", JSON.stringify(bill.items_json, null, 2));
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkBill();
