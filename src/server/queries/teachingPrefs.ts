import "server-only";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/api/errors";
import type {
  SaveTeachingPreferenceResult,
  SaveTeachingPreferencesRequest,
  SaveTeachingPreferencesResponse,
  TeachingPreferencesResponse,
} from "@/server/data/types";
import { resolveUserid } from "./identity";

// people.cfp_faculty_teaching_prefs is editable but lives outside the ubs_emp
// schema, so it is handled with plain knex statements (not the Editor protocol).
// Preference scale: 0 = Not Qualified … 5 = Most Preferred (per the DB change
// script — the legacy Java labels preference1/2/3 are retired).

const PREFS_TABLE = "people.cfp_faculty_teaching_prefs";

/** Latest active catalog row per crse_id (the catalog view has one row per effective date). */
const RANKED_CATALOG = `
  SELECT ranked.crse_id,
         ranked.primarycatalognumber,
         ranked.coursetitlelong
  FROM (
      SELECT cc.crse_id,
             cc.primarycatalognumber,
             cc.coursetitlelong,
             ROW_NUMBER() OVER (
                 PARTITION BY cc.crse_id
                 ORDER BY cc.effectivedate DESC
             ) AS rn
      FROM ps_rpt.ps_course_catalog_v cc
      WHERE cc.effectivestatus = 'A'
        AND cc.effectivedate <= CURRENT_DATE
  ) ranked
  WHERE ranked.rn = 1
`;

interface PrefRow {
  facultyId: string;
  courseId: string;
  pref: number;
  termCode: string | null;
  primaryCatalogNumber: string | null;
  courseTitleLong: string | null;
}

function buildCourseName(row: {
  courseId: string;
  primaryCatalogNumber: string | null;
  courseTitleLong: string | null;
}): string {
  const catalogNumber = row.primaryCatalogNumber?.trim();
  const title = row.courseTitleLong?.trim();
  if (catalogNumber && title) return `${catalogNumber}-${title}`;
  return `${row.courseId}-UNKNOWN COURSE`;
}

export async function getTeachingPreferences(
  idOrUserid: string
): Promise<TeachingPreferencesResponse> {
  const db = getDb();
  const userid = (await resolveUserid(idOrUserid)) ?? idOrUserid;
  const rows = await db.raw<[PrefRow[], unknown]>(
    `
    SELECT ftp.userid AS facultyId,
           ftp.crse_id AS courseId,
           ftp.pref AS pref,
           ftp.term_code AS termCode,
           cc.primarycatalognumber AS primaryCatalogNumber,
           cc.coursetitlelong AS courseTitleLong
    FROM ${PREFS_TABLE} ftp
    LEFT JOIN (${RANKED_CATALOG}) cc
      ON cc.crse_id = ftp.crse_id
    WHERE ftp.userid = ?
    ORDER BY ftp.crse_id
    `,
    [userid]
  );

  return {
    facultyId: userid,
    teachingPreferences: (rows[0] ?? []).map((row: PrefRow) => ({
      courseId: row.courseId,
      courseName: buildCourseName(row),
      pref: Number(row.pref),
      termCode: row.termCode ?? null,
    })),
  };
}

interface CatalogCourse {
  courseId: string;
  primaryCatalogNumber: string;
  courseTitleLong: string;
}

async function resolveCatalogCourse(courseName: string): Promise<CatalogCourse> {
  const separatorIndex = courseName.indexOf("-");
  if (separatorIndex <= 0 || separatorIndex === courseName.length - 1) {
    throw new BadRequestError("courseName must be in the format <catalogNumber>-<courseTitle>");
  }
  const primaryCatalogNumber = courseName.slice(0, separatorIndex).trim();
  const courseTitleLong = courseName.slice(separatorIndex + 1).trim();
  if (!primaryCatalogNumber || !courseTitleLong) {
    throw new BadRequestError("courseName must be in the format <catalogNumber>-<courseTitle>");
  }

  const db = getDb();
  const rows = await db.raw<[CatalogCourse[], unknown]>(
    `
    SELECT cc.crse_id AS courseId,
           cc.primarycatalognumber AS primaryCatalogNumber,
           cc.coursetitlelong AS courseTitleLong
    FROM (${RANKED_CATALOG}) cc
    WHERE TRIM(cc.primarycatalognumber) = ?
      AND TRIM(cc.coursetitlelong) = ?
    `,
    [primaryCatalogNumber, courseTitleLong]
  );

  const matches = rows[0] ?? [];
  if (matches.length === 0) {
    throw new NotFoundError(`Course not found in catalog: ${courseName}`);
  }
  if (matches.length > 1) {
    throw new ConflictError(`Multiple course catalog matches found for course name: ${courseName}`);
  }
  return matches[0] as CatalogCourse;
}

function validatePref(pref: unknown, courseName: string): number | null {
  if (pref === null || pref === undefined) return null;
  const value = Number(pref);
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new BadRequestError(
      `pref for "${courseName}" must be an integer from 0 (Not Qualified) to 5, or null to delete`
    );
  }
  return value;
}

export async function saveTeachingPreferences(
  idOrUserid: string,
  request: SaveTeachingPreferencesRequest
): Promise<SaveTeachingPreferencesResponse> {
  const userid = (await resolveUserid(idOrUserid)) ?? idOrUserid;
  if (!request || !Array.isArray(request.preferences) || request.preferences.length === 0) {
    throw new BadRequestError("preferences list must not be empty");
  }
  if (request.facultyId && request.facultyId !== userid) {
    throw new BadRequestError("Path facultyId and body facultyId must match");
  }

  const seen = new Set<string>();
  for (const item of request.preferences) {
    const courseName = item?.courseName?.trim();
    if (!courseName) {
      throw new BadRequestError("Every preference item requires a courseName");
    }
    if (!seen.add(courseName.toLowerCase())) {
      throw new BadRequestError(`Duplicate courseName in request: ${courseName}`);
    }
    validatePref(item.pref, courseName);
  }

  const db = getDb();
  const editor = getCurrentUser().userid;
  const termCode = request.termCode?.trim() || null;
  const processed: SaveTeachingPreferenceResult[] = [];

  for (const item of request.preferences) {
    const courseName = item.courseName.trim();
    const pref = validatePref(item.pref, courseName);
    const catalogCourse = await resolveCatalogCourse(courseName);

    const keyed = db(PREFS_TABLE)
      .where("userid", userid)
      .where("crse_id", catalogCourse.courseId)
      .modify((query) => {
        if (termCode) void query.where("term_code", termCode);
      });

    let action: SaveTeachingPreferenceResult["action"];
    if (pref === null) {
      await keyed.clone().delete();
      action = "DELETED";
    } else {
      const updated = await keyed.clone().update({
        pref,
        editor,
        ts: db.fn.now(),
      });
      if (updated > 0) {
        action = "UPDATED";
      } else {
        await db(PREFS_TABLE).insert({
          userid,
          crse_id: catalogCourse.courseId,
          term_code: termCode,
          pref,
          editor,
          ts: db.fn.now(),
        });
        action = "SAVED";
      }
    }

    processed.push({
      courseId: catalogCourse.courseId,
      courseName: `${catalogCourse.primaryCatalogNumber.trim()}-${catalogCourse.courseTitleLong.trim()}`,
      pref,
      action,
    });
  }

  return {
    facultyId: userid,
    totalRequested: request.preferences.length,
    totalProcessed: processed.length,
    processedPreferences: processed,
  };
}
