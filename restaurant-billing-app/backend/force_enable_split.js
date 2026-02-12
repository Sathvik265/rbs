const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function forceEnable() {
    const client = await pool.connect();
    try {
        console.log("Forcing is_separate=true for Idli and Dosa...");
        await client.query(`
            UPDATE items 
            SET is_separate = true 
            WHERE name ILIKE '%Idli%' OR name ILIKE '%Dosa%';
        `);
        console.log("Update complete.");

        const res = await client.query(`
            SELECT id, name, is_separate 
            FROM items 
            WHERE name ILIKE '%Idli%' OR name ILIKE '%Dosa%';
        `);
        console.table(res.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

forceEnable();
