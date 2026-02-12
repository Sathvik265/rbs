const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkCodes() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT id, name, numeric_code, alpha_code, is_separate 
            FROM items 
            WHERE name ILIKE '%Idli%' LIMIT 1;
        `);
        console.table(res.rows);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkCodes();
