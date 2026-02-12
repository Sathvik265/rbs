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
        console.log("--- START DEBUG V6 ---");

        // 1. Fetch values from latest Bill
        const billRes = await client.query(`SELECT track, clerk_initials FROM bills ORDER BY id DESC LIMIT 1`);

        let context = {
            track: 'TEST',
            clerk_initials: 'SYS'
        };

        if (billRes.rows.length > 0) {
            const b = billRes.rows[0];
            context.track = b.track || 'TEST';
            context.clerk_initials = b.clerk_initials || 'SYS';
        }

        // 2. Fetch Idli Item
        const itemRes = await client.query(`SELECT * FROM items WHERE name ILIKE '%Idli%' LIMIT 1`);
        if (itemRes.rows.length === 0) { console.log("Idli missing"); return; }
        const item = itemRes.rows[0];

        // 3. Create Dummy Order
        const now = new Date();
        const dummyOrder = {
            table_no: '999',
            party_no: '1',
            item_name: item.name,
            item_code: item.alpha_code || 'UNK',
            numeric_item_code: item.numeric_code || 0,
            quantity: 1,
            unit_price: 30,
            line_total: 30,
            track: context.track,
            clerk_initials: context.clerk_initials,
            created_at: now,
            updated_at: now,
            bill_date: now
        };

        console.log("Inserting Order...");

        const insertRes = await client.query(`
            INSERT INTO orders (
                table_no, party_no, item_name, item_code, numeric_item_code, 
                quantity, unit_price, line_total, track, clerk_initials,
                created_at, updated_at, bill_date
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id;
        `, [
            dummyOrder.table_no, dummyOrder.party_no, dummyOrder.item_name, dummyOrder.item_code, dummyOrder.numeric_item_code,
            dummyOrder.quantity, dummyOrder.unit_price, dummyOrder.line_total, dummyOrder.track, dummyOrder.clerk_initials,
            dummyOrder.created_at, dummyOrder.updated_at, dummyOrder.bill_date
        ]);

        console.log("Order Created ID:", insertRes.rows[0].id);

        // 4. Test JOIN
        console.log("Testing JOIN...");
        const joinQuery = `
            SELECT 
                o.item_name, 
                o.item_code as order_alpha,
                o.numeric_item_code as order_numeric,
                i.alpha_code as item_alpha,
                i.numeric_code as item_numeric,
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
        if (e.constraint) console.error("CONSTRAINT:", e.constraint);
    } finally {
        await client.query("DELETE FROM orders WHERE table_no = '999'");
        client.release();
        pool.end();
    }
}

simulateJoin();
