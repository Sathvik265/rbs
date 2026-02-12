const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function simulateJoin() {
    const client = await pool.connect();
    try {
        console.log("--- 1. Fetching Idli Item ---");
        const itemRes = await client.query(`SELECT * FROM items WHERE name ILIKE '%Idli%' LIMIT 1`);
        if (itemRes.rows.length === 0) {
            console.log("Idli not found in items table!");
            return;
        }
        const item = itemRes.rows[0];
        // console.log("Item Details:", JSON.stringify(item, null, 2));

        console.log("\n--- 2. Creating Dummy Order ---");

        // Handle potential NULL codes
        const dummyOrder = {
            table_no: '999',
            party_no: '1',
            item_name: item.name,
            // If item has no alpha code, send empty string or handle as needed
            item_code: item.alpha_code || 'UNK',
            // If item has no numeric code, we might need a dummy int if the column is NOT NULL
            numeric_item_code: item.numeric_code || 0,
            quantity: 1,
            unit_price: 30,
            line_total: 30
        };

        // Fetch valid track/clerk
        const trackRes = await client.query(`SELECT track, clerk_initials FROM orders LIMIT 1`);
        let validTrack = '`';
        let validClerk = 'SYS';
        if (trackRes.rows.length > 0) {
            validTrack = trackRes.rows[0].track;
            validClerk = trackRes.rows[0].clerk_initials;
        }

        console.log(`Using Track: ${validTrack}, Clerk: ${validClerk}`);

        const insertRes = await client.query(`
            INSERT INTO orders (table_no, party_no, item_name, item_code, numeric_item_code, quantity, unit_price, line_total, track, clerk_initials)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id;
        `, [dummyOrder.table_no, dummyOrder.party_no, dummyOrder.item_name, dummyOrder.item_code, dummyOrder.numeric_item_code, dummyOrder.quantity, dummyOrder.unit_price, dummyOrder.line_total, validTrack, validClerk]);

        console.log("Dummy Order Created ID:", insertRes.rows[0].id);

        console.log("\n--- 3. Testing JOIN ---");
        const joinQuery = `
            SELECT 
                o.item_name, 
                o.item_code as order_alpha, 
                o.numeric_item_code as order_numeric,
                i.alpha_code as item_alpha,
                i.numeric_code as item_numeric,
                i.is_separate,
                COALESCE(i.is_separate, false) as coalesced_separate
            FROM orders o
            LEFT JOIN items i ON (i.alpha_code = o.item_code OR i.numeric_code = o.numeric_item_code)
            WHERE o.table_no = '999' AND o.party_no = '1';
        `;

        const joinRes = await client.query(joinQuery);
        console.table(joinRes.rows);

        console.log("\n--- 4. Cleanup ---");
        // await client.query("DELETE FROM orders WHERE table_no = '999'");
        // console.log("Cleanup complete.");

    } catch (e) {
        console.error("FULL ERROR MSG:", e.message);
        console.error("DETAIL:", e.detail);
        console.error("HINT:", e.hint);
        console.error("CONSTRAINT:", e.constraint);
    } finally {
        // Always clean up test data if possible, or leave it for manual inspection
        await client.query("DELETE FROM orders WHERE table_no = '999'");
        client.release();
        pool.end();
    }
}

simulateJoin();
