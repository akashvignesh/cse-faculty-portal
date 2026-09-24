// Read-only rollup over a single faculty member's course preferences for the
// printable/exportable DataTable report. Pure transform only; callers load
// the preferences first (see facultyDetailService.fetchCoursePreferences).

import type { CoursePreference } from "@/types/faculty";

const PRIORITY_LABELS: Record<number, string> = {
  5: "Priority 5 (Most Preferred)",
  4: "Priority 4",
  3: "Priority 3",
  2: "Priority 2",
  1: "Priority 1 (Least Preferred)",
  0: "Not Qualified (NQ)",
};

function normalizePriority(priority: unknown): number | null {
  const numeric = Number(priority);
  if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 5) return numeric;

  const normalized = typeof priority === "string" ? priority.trim().toLowerCase() : "";
  switch (normalized) {
    case "preference1":
      return 1;
    case "preference2":
      return 2;
    case "preference3":
      return 3;
    case "not qualified":
      return 0;
    default:
      return null;
  }
}

export interface CourseReportRow {
  courseCode: string;
  courseName: string;
  priority: number;
  priorityLabel: string;
}

export function buildCourseReportRows(preferences: CoursePreference[]): CourseReportRow[] {
  return preferences
    .map((pref) => {
      const priority = normalizePriority(pref.priority);
      if (priority === null) return null;
      return {
        courseCode: pref.courseCode,
        courseName: pref.preferredCourseName,
        priority,
        priorityLabel: PRIORITY_LABELS[priority] ?? String(priority),
      };
    })
    .filter((row): row is CourseReportRow => row !== null)
    .sort((a, b) => b.priority - a.priority || a.courseCode.localeCompare(b.courseCode));
}
