const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function forceFix() {
    const client = await pool.connect();
    try {
        console.log("--- Force Fixing Constraints ---");

        // 1. Find all indexes/constraints on bills that might enforce uniqueness on bill_number/date
        const res = await client.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'bills' 
            AND indexdef LIKE '%UNIQUE%' 
            AND indexdef LIKE '%bill_number%';
        `);

        for (const row of res.rows) {
            console.log(`Dropping index/constraint: ${row.indexname}`);
            // Try dropping as constraint first, then index
            try {
                await client.query(`ALTER TABLE bills DROP CONSTRAINT IF EXISTS "${row.indexname}" CASCADE`);
            } catch (e) {
                // Ignore if not a constraint
            }
            await client.query(`DROP INDEX IF EXISTS "${row.indexname}" CASCADE`);
        }

        // 2. Re-create the partial unique index
        console.log("Creating partial unique index...");
        await client.query(`
            CREATE UNIQUE INDEX bills_bill_number_bill_date_unique 
            ON bills (bill_number, bill_date) 
            WHERE bill_number > 0;
        `);

        console.log("SUCCESS: Conflicts resolved and partial index applying.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

forceFix();
