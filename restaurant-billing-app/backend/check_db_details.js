const pool = require("./src/db");

async function listConstraintsAndIndexes() {
  try {
    console.log("--- Constraints ---");
    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
      AND conrelid = 'bills'::regclass
    `);
    constraints.rows.forEach((r) =>
      console.log(`Constraint: ${r.conname}, Def: ${r.pg_get_constraintdef}`)
    );

    console.log("\n--- Indexes ---");
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'bills'
    `);
    indexes.rows.forEach((r) =>
      console.log(`Index: ${r.indexname}, Def: ${r.indexdef}`)
    );
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

listConstraintsAndIndexes();
