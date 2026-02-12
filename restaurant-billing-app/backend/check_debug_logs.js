const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkLogs() {
    const client = await pool.connect();
    try {
        console.log("--- Checking Debug Logs ---");
        const res = await client.query(`
            SELECT id, message, data, created_at 
            FROM debug_logs 
            ORDER BY id DESC LIMIT 20
        `);

        if (res.rows.length === 0) {
            console.log("No logs found.");
        } else {
            res.rows.forEach(log => {
                console.log(`[${log.id}] ${log.message}:`);
                console.log(JSON.stringify(log.data, null, 2));
                console.log("--------------------------------------------------");
            });
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkLogs();
