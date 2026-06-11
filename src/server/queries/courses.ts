import "server-only";
import { getDb } from "@/lib/db";
import type { ActiveCourse } from "@/server/data/types";

interface ActiveCourseRow {
  courseId: string;
  subject: string;
  primaryCatalogNumber: string;
  courseTitleLong: string;
}

/** Active catalog courses, deduplicated to the latest effective row per crse_id. */
export async function getActiveCourses(): Promise<ActiveCourse[]> {
  const db = getDb();
  const rows = await db.raw<[ActiveCourseRow[], unknown]>(
    `
    SELECT ranked.crse_id AS courseId,
           TRIM(ranked.primarysubject) AS subject,
           TRIM(ranked.primarycatalognumber) AS primaryCatalogNumber,
           ranked.coursetitlelong AS courseTitleLong
    FROM (
        SELECT cc.crse_id,
               cc.primarysubject,
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
    ORDER BY TRIM(ranked.primarysubject) ASC,
             TRIM(ranked.primarycatalognumber) ASC
    `
  );

  return (rows[0] ?? []).map((row: ActiveCourseRow) => ({
    subject: row.subject,
    courseName: `${row.primaryCatalogNumber}-${row.courseTitleLong?.trim() ?? ""}`,
    courseId: row.courseId,
  }));
}
