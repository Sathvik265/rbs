const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkSP() {
    const client = await pool.connect();
    try {
        console.log("--- Checking User Function move_orders_to_bill_json ---");
        // We need to know the arguments to get the correct overload.
        // Based on BillingModel.js, it calls it with 3 arguments: table_no, party_no, bill_date.
        // Wait, current billingModel calls it effectively via `SELECT move_orders_to_bill_json($1, $2, $3)`?
        // Let's check pg_proc first to find the oid or name.

        const res = await client.query(`
            SELECT proname, prosrc, pg_get_functiondef(oid) as def
            FROM pg_proc 
            WHERE proname = 'move_orders_to_bill_json';
        `);

        if (res.rows.length === 0) {
            console.log("Function move_orders_to_bill_json NOT FOUND.");
        } else {
            res.rows.forEach((row, i) => {
                console.log(`\n--- Function Definition #${i + 1} ---`);
                console.log(row.def);
            });
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkSP();
