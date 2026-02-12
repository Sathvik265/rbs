const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkDuplicates() {
    const client = await pool.connect();
    try {
        console.log("--- Checking for Duplicate Numeric Codes ---");
        const res = await client.query(`
            SELECT numeric_code, count(*), string_agg(name, ', ') as names
            FROM items 
            WHERE numeric_code IS NOT NULL AND numeric_code != ''
            GROUP BY numeric_code 
            HAVING count(*) > 1
        `);

        if (res.rows.length === 0) {
            console.log("No duplicate numeric codes found.");
        } else {
            console.table(res.rows);
        }

        console.log("\n--- Validating Idli and Water Bottle ---");
        const res2 = await client.query(`
            SELECT name, alpha_code, numeric_code, is_separate 
            FROM items 
            WHERE name ILIKE '%Idli%' OR name ILIKE '%Water%'
        `);
        console.table(res2.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

checkDuplicates();
