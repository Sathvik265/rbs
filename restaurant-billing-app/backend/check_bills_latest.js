const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkBills() {
    const client = await pool.connect();
    try {
        console.log("--- Checking Latest 5 Bills ---");
        const res = await client.query(`
            SELECT id, bill_number, table_no, party_no, created_at, 
                   jsonb_array_length(items_json) as item_count,
                   items_json
            FROM bills 
            ORDER BY id DESC LIMIT 5
        `);

        if (res.rows.length === 0) {
            console.log("No bills found.");
        } else {
            res.rows.forEach(b => {
                console.log(`ID: ${b.id}, Bill No: ${b.bill_number}, Table: ${b.table_no}, Party: ${b.party_no}, Items: ${b.item_count}`);
                if (b.item_count === 0) {
                    console.log("  -> Empty Items JSON:", JSON.stringify(b.items_json));
                } else {
                    // print first item to see if valid
                    console.log("  -> First Item:", JSON.stringify(b.items_json[0]));
                }
            });
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkBills();
