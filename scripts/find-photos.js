/* eslint-disable */
const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: "127.0.0.1",
    port: 3307,
    user: process.env.DB_USER || "asureshk",
    password: process.env.DB_PASSWORD || "50608565",
    database: "information_schema",
  },
});

async function main() {
  const [rows] = await knex.raw(
    "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM TABLES WHERE TABLE_NAME LIKE '%photo%' OR TABLE_NAME LIKE '%cfp_cse%'"
  );
  rows.forEach((r) => console.log(`${r.TABLE_SCHEMA}.${r.TABLE_NAME} (${r.TABLE_TYPE})`));

  // sample of ub_display_name_v to learn name formats (uses an emplid that exists in dce)
  const [names] = await knex.raw(
    "SELECT emplid, name, name_display, name_formal, first_name, last_name FROM ps_rpt.ub_display_name_v LIMIT 3"
  );
  console.log("\nub_display_name_v sample:");
  names.forEach((r) => console.log("  " + JSON.stringify(r)));

  await knex.destroy();
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
