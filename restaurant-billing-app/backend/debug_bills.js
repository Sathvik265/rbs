const pool = require('./src/db');

async function debugBills() {
    try {
        const tableNo = 1;

        const billsCount = await pool.query("SELECT COUNT(*) FROM bills WHERE table_no = $1", [tableNo]);
        console.log(`BILLS_COUNT:${billsCount.rows[0].count}`);

        const ordersCount = await pool.query("SELECT COUNT(*) FROM orders WHERE table_no = $1", [tableNo]);
        console.log(`ORDERS_COUNT:${ordersCount.rows[0].count}`);

        // Check if ANY bill number 0 exists for table 1
        const provBill = await pool.query("SELECT id FROM bills WHERE table_no = $1 AND bill_number = 0", [tableNo]);
        console.log(`PROV_BILL_ID:${provBill.rows.length > 0 ? provBill.rows[0].id : 'NONE'}`);

    } catch (err) {
        console.error("ERROR:", err);
    } finally {
        pool.end();
    }
}

debugBills();
