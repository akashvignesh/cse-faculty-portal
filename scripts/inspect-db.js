// One-off schema inspection helper (dev tunnel must be open).
// Usage: node scripts/inspect-db.js
/* eslint-disable */
const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3307),
    user: process.env.DB_USER || "asureshk",
    password: process.env.DB_PASSWORD || "50608565",
    database: "ubs_emp",
    dateStrings: true,
  },
});

async function cols(schema, table) {
  const [rows] = await knex.raw(
    `SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [schema, table]
  );
  console.log(`\n== ${schema}.${table} columns ==`);
  rows.forEach((c) => console.log(`  ${c.COLUMN_NAME}  ${c.COLUMN_TYPE}`));
}

async function sample(label, sql) {
  try {
    const [rows] = await knex.raw(sql);
    console.log(`\n== ${label} ==`);
    rows.forEach((r) => console.log("  " + JSON.stringify(r)));
  } catch (e) {
    console.log(`\n== ${label} == ERR: ${e.message}`);
  }
}

async function main() {
  await cols("ps_rpt", "ub_display_name_v");
  await cols("people", "photos");
  await cols("people", "pref_photo");

  await sample("counts", `
    SELECT (SELECT COUNT(*) FROM cfp_faculty) AS faculty,
           (SELECT COUNT(*) FROM cfp_appointments) AS appointments,
           (SELECT COUNT(*) FROM cfp_faculty_primary_email) AS emails,
           (SELECT COUNT(*) FROM cfp_committee_catalog) AS catalog,
           (SELECT COUNT(*) FROM cfp_committee_assignment) AS assignments,
           (SELECT COUNT(*) FROM cfp_faculty_course_plan) AS plans,
           (SELECT COUNT(*) FROM cfp_faculty_semester_plan) AS slots,
           (SELECT COUNT(*) FROM cfp_service_categories) AS categories,
           (SELECT COUNT(*) FROM people.cfp_faculty_teaching_prefs) AS prefs`);

  await sample("faculty roster sample (joined)", `
    SELECT f.person_number, aed.name, aed.directory_title, dpn.principal AS userid,
           app.official_job_title, app.in_house_title, app.standard_course_load,
           pe.email_address
    FROM cfp_faculty f
    LEFT JOIN active_employee_directory aed ON aed.person_number = f.person_number
    LEFT JOIN dce.person_number dpn
      ON CONVERT(dpn.person_number USING utf8mb4) = CONVERT(f.person_number USING utf8mb4)
    LEFT JOIN cfp_appointments app ON app.person_number = f.person_number
    LEFT JOIN cfp_faculty_primary_email pe ON pe.person_number = f.person_number
    LIMIT 5`);

  await sample("ub_display_name_v sample", `SELECT * FROM ps_rpt.ub_display_name_v LIMIT 3`);

  await sample("phd_advisors sample", `
    SELECT pa.userid AS student_userid, pa.advisor, pa.termsourcekey, pa.pos, pa.active
    FROM people.phd_advisors pa WHERE pa.active = 1 LIMIT 5`);

  await sample("research areas sample", `
    SELECT fra.person_number, ram.area_name
    FROM cfp_faculty_research_areas fra
    JOIN cfp_research_area_master ram ON ram.research_area_id = fra.research_area_id
    LIMIT 5`);

  await sample("catalog sample", `
    SELECT catalog_id, source_committee_id, name, kind, service_category, display_order
    FROM cfp_committee_catalog ORDER BY display_order LIMIT 8`);

  await sample("teaching prefs sample", `
    SELECT userid, crse_id, term_code, pref FROM people.cfp_faculty_teaching_prefs LIMIT 5`);

  await sample("pref CHECK constraint", `
    SELECT cc.CONSTRAINT_NAME, cc.CHECK_CLAUSE
    FROM information_schema.CHECK_CONSTRAINTS cc
    JOIN information_schema.TABLE_CONSTRAINTS tc
      ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME AND tc.CONSTRAINT_SCHEMA = cc.CONSTRAINT_SCHEMA
    WHERE tc.TABLE_SCHEMA = 'people' AND tc.TABLE_NAME = 'cfp_faculty_teaching_prefs'`);

  await knex.destroy();
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});
