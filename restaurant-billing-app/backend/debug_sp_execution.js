const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function debugSP() {
    const client = await pool.connect();
    try {
        console.log("--- START SP EXECUTION DEBUG ---");

        // 1. Setup Context (Track/Clerk)
        const billQuery = await client.query(`SELECT track, clerk_initials FROM bills ORDER BY id DESC LIMIT 1`);
        const context = {
            track: billQuery.rows[0]?.track || 'TEST',
            clerk: billQuery.rows[0]?.clerk_initials || 'SYS'
        };

        // 2. Fetch Item (Idli)
        const itemRes = await client.query(`SELECT * FROM items WHERE name ILIKE '%Idli%' LIMIT 1`);
        const item = itemRes.rows[0];
        if (!item) throw new Error("Idli not found");

        const tableNo = '998'; // Use a distinct test table
        const partyNo = '1';

        // 3. Create Dummy Order
        console.log("Creating dummy order...");
        await client.query(`
            INSERT INTO orders (
                table_no, party_no, item_name, item_code, numeric_item_code, 
                quantity, unit_price, line_total, track, clerk_initials,
                created_at, updated_at, bill_date, bill_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW(), 0)
        `, [
            tableNo, partyNo, item.name, item.alpha_code, item.numeric_code,
            1, 30, 30, context.track, context.clerk
        ]);

        // 4. Create Dummy Bill
        console.log("Creating dummy bill...");
        const billRes = await client.query(`
            INSERT INTO bills (
                bill_number, bill_date, table_no, party_no, 
                grand_total, tax_amount, track, clerk_initials, items_json
            ) VALUES (
                0, NOW(), $1, $2, 30, 0, $3, $4, '[]'::jsonb
            ) RETURNING id
        `, [tableNo, partyNo, context.track, context.clerk]);

        const billId = billRes.rows[0].id;
        console.log(`Created Bill ID: ${billId}`);

        // 5. Call SP
        console.log(`Calling move_orders_to_bill_json(${billId}, '${tableNo}', '${partyNo}')...`);
        await client.query('SELECT move_orders_to_bill_json($1, $2, $3)', [billId, tableNo, partyNo]);

        // 6. Check Result
        console.log("Checking Bill Items...");
        const finalBillRes = await client.query('SELECT items_json FROM bills WHERE id = $1', [billId]);
        const items = finalBillRes.rows[0].items_json;

        console.log("Items JSON length:", items.length);
        console.log("Items JSON content:", JSON.stringify(items, null, 2));

        if (items.length > 0 && items[0].is_separate !== undefined) {
            console.log("SUCCESS: SP worked correctly.");
        } else {
            console.log("FAILURE: SP did not populate items correctly.");
        }

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        // Cleanup
        await client.query("DELETE FROM orders WHERE table_no = '998'");
        // await client.query("DELETE FROM bills WHERE table_no = '998'"); // Optional, maybe keep for inspection
        client.release();
        pool.end();
    }
}

debugSP();
