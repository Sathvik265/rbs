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
        console.log("--- Latest 10 Bills ---");
        const res = await client.query(`
            SELECT id, bill_number, table_no, party_no, 
                   to_char(created_at, 'HH24:MI:SS') as time,
                   jsonb_array_length(COALESCE(items_json, '[]'::jsonb)) as item_count
            FROM bills 
            ORDER BY id DESC LIMIT 10
        `);

        if (res.rows.length === 0) {
            console.log("No bills found.");
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

checkBills();
