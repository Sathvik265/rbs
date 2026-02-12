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
        const res = await client.query(`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = 'bills' 
        `);

        const cols = res.rows.map(r => r.column_name);
        console.log("Columns:", cols.join(", "));

        if (cols.includes('items') && cols.includes('items_json')) {
            console.log("CONFLICT DETECTED: Both 'items' and 'items_json' exist.");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkSchema();
