import "server-only";
import knex, { type Knex } from "knex";
import { ApiError } from "./api/errors";
import { env, isDbMode } from "./env";

/**
 * Every table the app is allowed to write, whichever path performs the write.
 * Anything absent is read-only by ground rule and must only be touched via
 * SELECTs in src/server/queries — including the pre-existing cfp_faculty and
 * the whole of people.*, ps_rpt.*, dce.* and ubs_rf.*.
 *
 * This is the single source of truth: the Editor factory (createEditor) and
 * the hand-rolled knex routes both go through assertWritable()/writable()
 * below, so a new write path cannot quietly reach an unlisted table.
 *
 * Unqualified names resolve in the connection's default ubs_emp schema.
 */
export const WRITABLE_TABLES: ReadonlySet<string> = new Set([
  // Editor-protocol tables (src/lib/editor/factory.ts)
  "cfp_faculty_course_plan",
  "cfp_faculty_semester_plan",
  "cfp_faculty_role",
  "cfp_service_categories",
  "cfp_committee_service_summary",
  "cfp_faculty_leave",
  "cfp_area_tag_master",
  "cfp_course_area_tag",
  "cfp_user_role",
  // Faculty profile editor (src/server/queries/profile.ts) — contact details
  // and research-area links. cfp_research_area_master is NOT here: the profile
  // editor only reads it to validate the ids it links to.
  "cfp_faculty_primary_email",
  "cfp_faculty_primary_phone_number",
  "cfp_faculty_primary_address",
  "cfp_faculty_research_areas",
  // Cross-schema tables written with plain knex rather than Editor.
  "people.cfp_faculty_teaching_prefs", // teaching preferences
  "committees.members", // committee matrix cells
  // The matrix's column list. Owned rather than read-only: the catalog route
  // creates, renames and DELETES committees (cascading through members), so
  // this is a genuine exception to "committees.* is upstream data".
  "committees.committees",
]);

/** Throws unless `table` is on the writable allowlist above. */
export function assertWritable(table: string): void {
  if (!WRITABLE_TABLES.has(table)) {
    throw new ApiError(500, `Table is not editable: ${table}`);
  }
}

/**
 * Query builder for a table the app is allowed to write. Use this instead of
 * `getDb()(table)` for every INSERT/UPDATE/DELETE so the allowlist is on the
 * write path itself rather than an easily-forgotten precondition. Pass `trx`
 * to enlist in an open transaction. Reads may use getDb() directly.
 */
export function writable(table: string, trx?: Knex.Transaction): Knex.QueryBuilder {
  assertWritable(table);
  return (trx ?? getDb())(table);
}

function createKnex(): Knex {
  return knex({
    client: "mysql2",
    connection: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE,
      // Keep DATE/DATETIME values as plain strings — no timezone drift, and
      // matches what the Editor server library and the DTO contract expect.
      dateStrings: true,
      charset: "utf8mb4",
    },
    // Everything flows through one SSH tunnel; keep the pool small. Without
    // the globalThis singleton below, Next.js dev hot-reload would leak pools
    // until the tunnel stops accepting connections (manifests as hangs).
    pool: { min: 0, max: 5 },
  });
}

const globalCache = globalThis as unknown as { __cfpKnex?: Knex };

/** Lazily creates the shared knex instance. Throws in local (mock) mode. */
export function getDb(): Knex {
  if (!isDbMode) {
    throw new Error("Database access requires FACULTY_DATA_MODE=db (current mode is local/mock).");
  }
  if (!globalCache.__cfpKnex) {
    globalCache.__cfpKnex = createKnex();
  }
  return globalCache.__cfpKnex;
}
