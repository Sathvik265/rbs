const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function createDebugTable() {
    const client = await pool.connect();
    try {
        console.log("--- Creating debug_logs table ---");
        await client.query(`
            CREATE TABLE IF NOT EXISTS debug_logs (
                id SERIAL PRIMARY KEY,
                message TEXT,
                data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("debug_logs table created.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

createDebugTable();
