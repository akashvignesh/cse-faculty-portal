import "server-only";
import { getDb } from "@/lib/db";
import { decodeTermCode } from "@/lib/term";
import type { TermKey } from "@/types/faculty";
import type {
  TeachingHistoryEntry,
  TeachingHistoryResponse,
  TeachingHistoryYear,
} from "@/server/data/types";
import { resolvePersonNumber } from "./identity";

// Port of FacultyTeachingHistoryRepository.findTeachingHistory: class schedule
// rows joined to the latest active catalog row per course.

interface TeachingHistoryRow {
  faculty: string | null;
  facultySourceKey: string;
  classNumber: string | null;
  termSourceKey: string | null;
  courseType: string | null;
  courseCareerSourceKey: string | null;
  courseId: string | null;
  primaryCatalogNumber: string | null;
  courseTitleLong: string | null;
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildCourseName(row: TeachingHistoryRow): string | null {
  const catalogNumber = trimToNull(row.primaryCatalogNumber);
  const title = trimToNull(row.courseTitleLong);
  if (catalogNumber && title) return `${catalogNumber}-${title}`;
  return catalogNumber ?? title ?? trimToNull(row.courseId);
}

function decodeCourseCareer(courseCareerSourceKey: string | null): string | null {
  const normalized = trimToNull(courseCareerSourceKey);
  if (!normalized) return null;
  switch (normalized.toUpperCase()) {
    case "UGRD":
      return "Undergraduate";
    case "GRAD":
      return "Graduate";
    default:
      return normalized;
  }
}

function compareClassNumbers(left: string | null, right: string | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) return Number(left) - Number(right);
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

export async function getTeachingHistory(
  facultySourceKey: string
): Promise<TeachingHistoryResponse | null> {
  const db = getDb();
  // Accept a userid as well — the schedule view keys on person number.
  const key = await resolvePersonNumber(facultySourceKey);
  if (!key) return null;

  const rows = await db.raw<[TeachingHistoryRow[], unknown]>(
    `
    SELECT cs.faculty AS faculty,
           cs.facultysourcekey AS facultySourceKey,
           cs.classnumber AS classNumber,
           cs.termsourcekey AS termSourceKey,
           cs.coursetype AS courseType,
           cs.coursecareersourcekey AS courseCareerSourceKey,
           cs.courseid AS courseId,
           cc.primarycatalognumber AS primaryCatalogNumber,
           cc.coursetitlelong AS courseTitleLong
    FROM ps_rpt.classschedule_v cs
    LEFT JOIN (
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
    ) cc
      ON cc.crse_id = cs.courseid
    WHERE cs.facultysourcekey = ?
    ORDER BY cs.termsourcekey DESC,
             cs.classnumber ASC,
             cs.courseid ASC
    `,
    [key]
  );

  const historyRows: TeachingHistoryRow[] = rows[0] ?? [];

  const faculty =
    historyRows
      .map((row) => trimToNull(row.faculty))
      .find((value): value is string => value !== null) ?? null;

  const yearsByYear = new Map<number, Record<TermKey, TeachingHistoryEntry[]>>();
  for (const row of historyRows) {
    const decoded = decodeTermCode(row.termSourceKey);
    if (!decoded) continue;

    let buckets = yearsByYear.get(decoded.year);
    if (!buckets) {
      buckets = { spring: [], summer: [], fall: [] };
      yearsByYear.set(decoded.year, buckets);
    }
    buckets[decoded.term].push({
      classNumber: trimToNull(row.classNumber),
      courseName: buildCourseName(row),
      courseType: trimToNull(row.courseType),
      courseCareer: decodeCourseCareer(row.courseCareerSourceKey),
    });
  }

  const years: TeachingHistoryYear[] = [...yearsByYear.entries()]
    .sort(([left], [right]) => right - left)
    .map(([year, buckets]) => ({
      year,
      spring: buckets.spring.sort((a, b) => compareClassNumbers(a.classNumber, b.classNumber)),
      summer: buckets.summer.sort((a, b) => compareClassNumbers(a.classNumber, b.classNumber)),
      fall: buckets.fall.sort((a, b) => compareClassNumbers(a.classNumber, b.classNumber)),
    }));

  return {
    faculty,
    facultySourceKey: key,
    years,
  };
}
