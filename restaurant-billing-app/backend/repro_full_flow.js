const BillingModel = require('./src/models/billingModel');
const OrderModel = require('./src/models/orderModel');
const pool = require('./src/db');

async function repro() {
    try {
        console.log("--- START REPRO FULL FLOW ---");

        // 1. Setup Context
        const track = 'TEST';
        const clerk = 'SYS';
        const table = '997';
        const party = '1';

        // 2. Clear previous test data
        await pool.query('DELETE FROM orders WHERE table_no = $1', [table]);
        await pool.query('DELETE FROM bills WHERE table_no = $1', [table]); // Note: bills table might use INTEGER for table_no

        // 3. Fetch Item (Water Bottle)
        const itemRes = await pool.query("SELECT * FROM items WHERE name ILIKE '%Water%' LIMIT 1");
        const item = itemRes.rows[0];
        if (!item) throw new Error("Item not found");
        console.log(`Using Item: ${item.name} (${item.alpha_code})`);

        // 4. Create Order using OrderModel
        console.log("Creating Order...");
        const orderData = {
            table_no: table,
            party_no: party,
            item_name: item.name,
            item_code: item.alpha_code,
            numeric_item_code: item.numeric_code,
            quantity: 1,
            unit_price: 20,
            line_total: 20,
            bill_number: 0,
            track: track,
            clerk_initials: clerk,
            created_at: new Date() // Important
        };
        const order = await OrderModel.createOrder(orderData);
        console.log("Order Created:", order.id);

        // 5. Create Provisional Bill using BillingModel
        console.log("Creating Provisional Bill...");
        const billData = {
            bill_date: new Date().toISOString().split('T')[0],
            table_no: table,
            party_no: party,
            section: 'G',
            track: track,
            clerk_initials: clerk,
            created_at: orderData.created_at
        };
        const provBill = await BillingModel.createProvisionalBill(billData);
        console.log("Provisional Bill ID:", provBill.id);

        // 6. Verify Orders Exist BEFORE Finalize
        const pendOrders = await OrderModel.getPendingOrdersByTableAndParty(table, party);
        console.log(`Pending Orders Before Finalize: ${pendOrders.length}`);
        if (pendOrders.length === 0) console.error("WARNING: No pending orders found!");

        // 7. Finalize Bill using BillingModel
        console.log("Finalizing Bill...");
        const finalizeData = {
            table_no: table,
            party_no: party,
            track: track,
            clerk_initials: clerk,
            bill_date: billData.bill_date,
            subtotal: 20,
            sgst: 0,
            cgst: 0,
            tax_amount: 0,
            grand_total: 20,
            order_id: 'ORD-TEST',
            created_at: provBill.created_at // MATCHING KEY
        };

        const result = await BillingModel.finalizeBill(finalizeData);
        console.log("Finalize Result:", result);

        // 8. Verify Bill Items
        console.log("Verifying Bill Items...");
        const items = await BillingModel.getBillItems(result.bill_id);
        console.log("Items JSON Length:", items.length);
        console.log("Items JSON:", JSON.stringify(items, null, 2));

        if (items.length > 0) {
            console.log("SUCCESS: Items populated.");
        } else {
            console.log("FAILURE: Items empty.");
        }

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await pool.end();
    }
}

repro();
