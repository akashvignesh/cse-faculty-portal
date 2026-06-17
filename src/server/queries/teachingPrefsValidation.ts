import { BadRequestError } from "@/lib/api/errors";

// Pure validation for teaching-preference saves. Kept free of "server-only" so
// it is unit-testable; the DB-touching logic stays in teachingPrefs.ts.
//
// Preference scale: 0 = Not Qualified … 5 = Most Preferred (per the DB change
// script — the legacy Java labels preference1/2/3 are retired). The live table
// must carry CHECK chk_pref_range (pref BETWEEN 0 AND 5); see
// db/migration/widen_teaching_pref_check.sql.
export function validatePref(pref: unknown, courseName: string): number | null {
  if (pref === null || pref === undefined) return null;
  const value = Number(pref);
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new BadRequestError(
      `pref for "${courseName}" must be an integer from 0 (Not Qualified) to 5, or null to delete`
    );
  }
  return value;
}

/** Live CHECK: regexp_like(term_code, '^[0-9]{3}[569]$'). */
export const TERM_CODE_PATTERN = /^[0-9]{3}[569]$/;
