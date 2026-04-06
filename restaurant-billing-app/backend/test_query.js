const pool = require("./src/db/index");

async function run() {
  try {
    const colName = '"RBS1"';
    const q = `UPDATE running_bills SET ${colName} = ${colName} + 1 WHERE id = 1 RETURNING ${colName} as max_num`;
    console.log(q);
    const result = await pool.query(q);
    console.log(result.rows);
  } catch(e) {
    console.error("FAIL", e);
  } finally {
    process.exit(0);
  }
}
run();
