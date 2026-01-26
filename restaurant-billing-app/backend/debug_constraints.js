const pool = require("./src/db");
const fs = require("fs");

async function debug() {
  try {
    const constraints = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
      AND conrelid = 'bills'::regclass
    `);

    let output = "CONSTRAINTS:\n";
    constraints.rows.forEach((r) => {
      output += `Name: ${r.conname}\nDefinition: ${r.pg_get_constraintdef}\n\n`;
    });

    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'bills'
    `);

    output += "INDEXES:\n";
    indexes.rows.forEach((r) => {
      output += `Name: ${r.indexname}\nDefinition: ${r.indexdef}\n\n`;
    });

    fs.writeFileSync("constraints.txt", output);
    console.log("Written to constraints.txt");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

debug();
