import "server-only";
import knex, { type Knex } from "knex";
import { env, isDbMode } from "./env";

/**
 * Only the new cfp_* tables (in the connection's default ubs_emp schema) accept
 * writes through the Editor protocol. Every other university table — including
 * the pre-existing read-only cfp_faculty — must only be touched via SELECTs in
 * src/server/queries with schema-qualified names.
 *
 * people.cfp_faculty_teaching_prefs is also editable, but lives in another
 * schema, so it is written via plain knex statements rather than Editor.
 */
export const WRITABLE_TABLES: ReadonlySet<string> = new Set([
  "cfp_faculty_course_plan",
  "cfp_faculty_semester_plan",
  "cfp_committee_catalog",
  "cfp_committee_assignment",
  "cfp_service_categories",
  "cfp_committee_service_summary",
]);

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
    throw new Error(
      "Database access requires FACULTY_DATA_MODE=db (current mode is local/mock)."
    );
  }
  if (!globalCache.__cfpKnex) {
    globalCache.__cfpKnex = createKnex();
  }
  return globalCache.__cfpKnex;
}
