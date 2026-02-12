const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkSchema() {
    const client = await pool.connect();
    try {
        console.log("--- Checking Orders Table Schema ---");
        const res = await client.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            AND column_name IN ('table_no', 'party_no', 'item_code', 'numeric_item_code')
        `);

        console.table(res.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkSchema();
