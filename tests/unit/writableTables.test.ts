import { describe, expect, it } from "vitest";
import { assertWritable, WRITABLE_TABLES } from "@/lib/db";

// The allowlist is the single source of truth for "what may the app write".
// It drifted twice before this test existed: the committee-matrix rewrite
// started writing committees.members / committees.committees, and the profile
// editor started writing the four contact tables — neither was ever added, and
// nothing caught it because only createEditor() consulted the list.
//
// Pinning the contents makes any change a deliberate, reviewed one.
const EXPECTED = [
  // Editor-protocol tables
  "cfp_faculty_course_plan",
  "cfp_faculty_semester_plan",
  "cfp_faculty_role",
  "cfp_service_categories",
  "cfp_committee_service_summary",
  "cfp_faculty_leave",
  "cfp_area_tag_master",
  "cfp_course_area_tag",
  "cfp_user_role",
  // Faculty profile editor
  "cfp_faculty_primary_email",
  "cfp_faculty_primary_phone_number",
  "cfp_faculty_primary_address",
  "cfp_faculty_research_areas",
  // Cross-schema, written with plain knex
  "people.cfp_faculty_teaching_prefs",
  "committees.members",
  "committees.committees",
];

describe("WRITABLE_TABLES", () => {
  it("contains exactly the tables the app is allowed to write", () => {
    expect([...WRITABLE_TABLES].sort()).toEqual([...EXPECTED].sort());
  });

  it("excludes the read-only university tables", () => {
    for (const table of [
      "cfp_faculty", // pre-existing, upstream-owned
      "cfp_research_area_master", // profile editor only reads it to validate ids
      "cfp_appointments",
      "cfp_documents",
      "cfp_faculty_load_balance",
      "cfp_teaching_reductions",
      "cfp_committee_assignment", // retired by the committee-matrix rewrite
      "ps_rpt.classschedule_v",
      "dce.person_number",
      "facilities.occupants",
    ]) {
      expect(WRITABLE_TABLES.has(table)).toBe(false);
    }
  });

  it("schema-qualifies every cross-schema entry", () => {
    // An unqualified name resolves in ubs_emp, so a bare "members" would
    // silently allowlist the wrong table.
    for (const table of WRITABLE_TABLES) {
      if (table.includes(".")) {
        expect(table.split(".")).toHaveLength(2);
      } else {
        expect(table.startsWith("cfp_")).toBe(true);
      }
    }
  });
});

describe("assertWritable", () => {
  it("passes every allowlisted table", () => {
    for (const table of WRITABLE_TABLES) {
      expect(() => assertWritable(table)).not.toThrow();
    }
  });

  it("rejects a table that is not on the list", () => {
    expect(() => assertWritable("cfp_faculty")).toThrow(/not editable/i);
    expect(() => assertWritable("ps_rpt.classschedule_v")).toThrow(/not editable/i);
  });

  it("rejects a near-miss rather than matching loosely", () => {
    expect(() => assertWritable("members")).toThrow(/not editable/i);
    expect(() => assertWritable("ubs_emp.cfp_user_role")).toThrow(/not editable/i);
    expect(() => assertWritable("")).toThrow(/not editable/i);
  });
});
