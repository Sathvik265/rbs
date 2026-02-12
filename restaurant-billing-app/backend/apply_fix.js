const fs = require('fs');
const path = require('path');
const pool = require('./src/db');

async function runFix() {
    try {
        const sqlPath = path.join(__dirname, 'fix_sp_final.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing SQL fix...");
        await pool.query(sql);
        console.log("✅ SQL fix executed successfully.");

    } catch (err) {
        console.error("❌ Error executing SQL fix:", err);
    } finally {
        pool.end();
    }
}

runFix();
