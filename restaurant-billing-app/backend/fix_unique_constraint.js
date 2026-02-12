const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function updateConstraint() {
    const client = await pool.connect();
    try {
        console.log("Replacing unique constraint on bills...");

        // Drop the existing constraint (if it exists as a constraint or index)
        // We'll try dropping both constraint and index to be safe.
        // Note: Constraint name usually matches index name by default.

        await client.query(`
            ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_bill_number_bill_date_key;
        `);

        await client.query(`
            DROP INDEX IF EXISTS bills_bill_number_bill_date_key;
        `);

        // Create partial unique index
        // Allow duplicate bill_number=0 (provisional bills)
        // Enforce uniqueness only for finalized bills (bill_number > 0)
        await client.query(`
            CREATE UNIQUE INDEX bills_bill_number_bill_date_unique 
            ON bills (bill_number, bill_date) 
            WHERE bill_number > 0;
        `);

        console.log("Constraint replaced with partial unique index successfully.");
    } catch (e) {
        console.error("Error updating constraint:", e);
    } finally {
        client.release();
        pool.end();
    }
}

updateConstraint();
