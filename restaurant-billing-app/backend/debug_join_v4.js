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
        console.log("--- START DEBUG V4 ---");

        // 1. Fetch values from latest Bill (since orders might be empty)
        console.log("Fetching context from latest bill...");
        const billRes = await client.query(`SELECT shift_id, session_id, track, clerk_initials FROM bills ORDER BY id DESC LIMIT 1`);

        let context = {
            shift_id: null,
            session_id: null,
            track: '`',
            clerk_initials: 'SYS'
        };

        if (billRes.rows.length > 0) {
            const b = billRes.rows[0];
            context.shift_id = b.shift_id;
            context.session_id = b.session_id;
            context.track = b.track || '`';
            context.clerk_initials = b.clerk_initials || 'SYS';
        }
        console.log("Context:", context);

        // 2. Fetch Idli Item
        const itemRes = await client.query(`SELECT * FROM items WHERE name ILIKE '%Idli%' LIMIT 1`);
        if (itemRes.rows.length === 0) { console.log("Idli missing"); return; }
        const item = itemRes.rows[0];

        // 3. Create Dummy Order
        const dummyOrder = {
            table_no: '999',
            party_no: '1',
            item_name: item.name,
            item_code: item.alpha_code || 'UNK',
            numeric_item_code: item.numeric_code || 0,
            quantity: 1,
            unit_price: 30,
            line_total: 30,
            shift_id: context.shift_id,
            session_id: context.session_id,
            track: context.track,
            clerk_initials: context.clerk_initials
        };

        console.log("Inserting Order...");
        // Note: I'm assuming orders table has shift_id and session_id columns. 
        // If not, the insert will fail, but the error will tell me.
        // Based on recent features, it likely does.

        // Use a dynamic query construction to be safe?
        // Let's try inserting with specific columns.

        const insertRes = await client.query(`
            INSERT INTO orders (
                table_no, party_no, item_name, item_code, numeric_item_code, 
                quantity, unit_price, line_total, track, clerk_initials,
                shift_id, session_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id;
        `, [
            dummyOrder.table_no, dummyOrder.party_no, dummyOrder.item_name, dummyOrder.item_code, dummyOrder.numeric_item_code,
            dummyOrder.quantity, dummyOrder.unit_price, dummyOrder.line_total, dummyOrder.track, dummyOrder.clerk_initials,
            dummyOrder.shift_id, dummyOrder.session_id
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
    } finally {
        await client.query("DELETE FROM orders WHERE table_no = '999'");
        client.release();
        pool.end();
    }
}

simulateJoin();
