const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function listFunctions() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT p.proname as function_name, pg_get_function_identity_arguments(p.oid) as arguments
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = 'move_orders_to_bill_json';
        `);
        console.log("Existing functions:");
        res.rows.forEach(r => console.log(`- ${r.function_name}(${r.arguments})`));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

listFunctions();
