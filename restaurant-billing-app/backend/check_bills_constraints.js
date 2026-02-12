const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugConstraints() {
    const client = await pool.connect();
    try {
        console.log("\n--- Constraints on 'bills' ---");
        const cons = await client.query(`
            SELECT con.conname, pg_get_constraintdef(con.oid)
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = 'bills';
        `);
        console.table(cons.rows);

        console.log("\n--- Indexes on 'bills' ---");
        const idxs = await client.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'bills';
        `);
        console.table(idxs.rows);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

debugConstraints();
