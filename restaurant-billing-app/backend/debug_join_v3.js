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
        console.log("--- START DEBUG ---");

        // 1. Fetch Idli Item
        const itemRes = await client.query(`SELECT * FROM items WHERE name ILIKE '%Idli%' LIMIT 1`);
        if (itemRes.rows.length === 0) { console.log("Idli missing"); return; }
        const item = itemRes.rows[0];
        console.log(`Found Item: ${item.name}, Alpha: ${item.alpha_code}, Numeric: ${item.numeric_code}, IsSep: ${item.is_separate}`);

        // 2. Fetch Valid Track/Clerk
        const trackRes = await client.query(`SELECT track, clerk_initials FROM orders LIMIT 1`);
        let validTrack = '`';
        let validClerk = 'SYS';
        if (trackRes.rows.length > 0) {
            validTrack = trackRes.rows[0].track;
            validClerk = trackRes.rows[0].clerk_initials;
        }
        console.log(`Using Track: ${validTrack}, Clerk: ${validClerk}`);

        // 3. Create Dummy Order
        const dummyOrder = {
            table_no: '999',
            party_no: '1',
            item_name: item.name,
            item_code: item.alpha_code || 'UNK',
            numeric_item_code: item.numeric_code || 0,
            quantity: 1,
            unit_price: 30,
            line_total: 30
        };

        console.log("Inserting Order...");
        const insertRes = await client.query(`
            INSERT INTO orders (table_no, party_no, item_name, item_code, numeric_item_code, quantity, unit_price, line_total, track, clerk_initials)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id;
        `, [dummyOrder.table_no, dummyOrder.party_no, dummyOrder.item_name, dummyOrder.item_code, dummyOrder.numeric_item_code, dummyOrder.quantity, dummyOrder.unit_price, dummyOrder.line_total, validTrack, validClerk]);

        console.log("Order Created ID:", insertRes.rows[0].id);

        // 4. Test JOIN
        console.log("Testing JOIN...");
        const joinQuery = `
            SELECT 
                o.item_name, 
                i.is_separate,
                COALESCE(i.is_separate, false) as final_separate
            FROM orders o
            LEFT JOIN items i ON (i.alpha_code = o.item_code OR i.numeric_code = o.numeric_item_code)
            WHERE o.table_no = '999' AND o.party_no = '1';
        `;

        const joinRes = await client.query(joinQuery);
        console.table(joinRes.rows);

    } catch (e) {
        console.error("ERROR MSG:", e.message);
        console.error("DETAIL:", e.detail);
    } finally {
        await client.query("DELETE FROM orders WHERE table_no = '999'");
        client.release();
        pool.end();
    }
}

simulateJoin();
