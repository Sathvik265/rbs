const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function dumpSP() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT pg_get_functiondef(oid) as def
            FROM pg_proc 
            WHERE proname = 'move_orders_to_bill_json';
        `);

        let output = "";
        res.rows.forEach((row, i) => {
            output += `--- Function Definition #${i + 1} ---\n`;
            output += row.def + "\n\n";
        });

        fs.writeFileSync('sp_def.sql', output);
        console.log("SP definition dumped to sp_def.sql");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

dumpSP();
