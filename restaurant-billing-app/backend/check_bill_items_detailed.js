const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkBillItems() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT id, bill_number, items_json 
            FROM bills 
            ORDER BY id DESC 
            LIMIT 1
        `);

        if (res.rows.length === 0) {
            console.log("No bills found.");
            return;
        }

        const bill = res.rows[0];
        console.log(`Bill ID: ${bill.id}, Number: ${bill.bill_number}`);

        const items = bill.items_json || [];
        console.log(`Found ${items.length} items.`);

        items.forEach(item => {
            console.log("--------------------------------------------------");
            console.log(`Name: "${item.item_name}"`);
            console.log(`Alpha: "${item.item_code_alpha}"`);
            console.log(`Numeric: "${item.item_code_numeric}"`);
            console.log(`IsSeparate: ${item.is_separate}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkBillItems();
