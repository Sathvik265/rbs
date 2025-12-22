const pool = require("./src/db");

async function checkConstraints() {
  try {
    const res = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
      AND conrelid = 'bills'::regclass
    `);
    console.log("Constraints on bills table:");
    res.rows.forEach((r) =>
      console.log(`${r.conname}: ${r.pg_get_constraintdef}`)
    );
  } catch (err) {
    console.error("Error:", err);
  } finally {
    // We can't easily close the pool if it's not exported with an end method, but process.exit works
    process.exit(0);
  }
}

checkConstraints();
