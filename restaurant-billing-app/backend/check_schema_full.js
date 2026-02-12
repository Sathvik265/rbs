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

async function dumpSchema() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'orders' 
            ORDER BY ordinal_position;
        `);

        let output = "--- ORDERS TABLE SCHEMA ---\n";
        res.rows.forEach(row => {
            output += `${row.column_name} | ${row.data_type} | Nullable: ${row.is_nullable} | Default: ${row.column_default}\n`;
        });

        fs.writeFileSync('schema_dump.txt', output);
        console.log("Schema dumped to schema_dump.txt");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        client.release();
        pool.end();
    }
}

dumpSchema();
