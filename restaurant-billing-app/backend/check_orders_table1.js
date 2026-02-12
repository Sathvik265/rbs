const { Pool } = require('pg');
const pool = require('./src/db');

async function checkOrders() {
    try {
        console.log("--- Checking Pending Orders for Table 1 ---");
        const res = await pool.query(`
            SELECT * FROM orders 
            WHERE table_no = '1' 
            ORDER BY created_at DESC
        `);

        if (res.rows.length === 0) {
            console.log("No pending orders found for Table 1.");
        } else {
            console.table(res.rows);
            // Log specifically the track and clerk
            console.log("Track:", res.rows[0].track);
            console.log("Clerk:", res.rows[0].clerk_initials);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await pool.end();
    }
}

checkOrders();
