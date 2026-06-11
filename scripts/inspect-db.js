// Read-only schema inspection helper for the university DB (dev tunnel must
// be open). Credentials come from the environment — never hardcode them.
//
//   $env:DB_USER="..."; $env:DB_PASSWORD="..."; node scripts/inspect-db.js
/* eslint-disable */
if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error("Set DB_USER and DB_PASSWORD env vars (see .env.local).");
  process.exit(1);
}

const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || "ubs_emp",
    dateStrings: true,
  },
});

const SCHEMAS = ["ubs_emp", "people", "dce", "committees", "ps_rpt", "sunycard"];

async function main() {
  for (const schema of SCHEMAS) {
    const [tables] = await knex.raw(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [schema]
    );
    console.log(`\n== ${schema} ==`);
    tables.forEach((t) => console.log("  " + t.TABLE_NAME));
  }

  const table = process.argv[2];
  if (table) {
    const [schema, name] = table.includes(".") ? table.split(".") : ["ubs_emp", table];
    const [cols] = await knex.raw(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [schema, name]
    );
    console.log(`\n== ${schema}.${name} columns ==`);
    cols.forEach((c) =>
      console.log(
        `  ${c.COLUMN_NAME}  ${c.COLUMN_TYPE}  ${c.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL"}${c.COLUMN_KEY ? "  [" + c.COLUMN_KEY + "]" : ""}${c.EXTRA ? "  " + c.EXTRA : ""}`
      )
    );
  }

  await knex.destroy();
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
