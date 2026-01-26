const pool = require("./src/db");

async function checkDeps() {
  try {
    const res = await pool.query(`
      SELECT 
        d.classid::regclass AS "class",
        pg_describe_object(d.classid, d.objid, d.objsubid) as description
      FROM pg_depend d
      JOIN pg_constraint c ON c.oid = d.refobjid
      WHERE c.conname = 'bills_bill_number_bill_date_key'
    `);

    console.log("DEPENDENCIES:");
    res.rows.forEach((r) => {
      console.log(`Class: ${r.class}, Description: ${r.description}`);
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

checkDeps();
