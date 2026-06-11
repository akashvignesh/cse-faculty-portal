// Mock data for the redesigned Course Preference feature.
// This is frontend-only mock state; no backend persistence.

import type {
  PlannerCoursePreference,
  SemesterSlot,
  SlotStatus,
  YearData,
} from "../types/faculty";

export interface AcademicYearOption {
  year: string;
  locked: boolean;
}

export const INITIAL_ACADEMIC_YEARS: AcademicYearOption[] = [
  { year: "2022-2023", locked: true },
  { year: "2023-2024", locked: true },
  { year: "2024-2025", locked: true },
  { year: "2025-2026", locked: false },
];

function slot(id: string, status: SlotStatus, comment: string): SemesterSlot {
  return { id, status, comment };
}

function pref(
  id: string,
  courseCode: string,
  courseName: string,
  ranking: number
): PlannerCoursePreference {
  return { id, courseCode, courseName, ranking };
}

// biannualDeferred=true  → biannual slot is "Not Teaching + Deferred or Taught Biannual" (skip year)
// biannualDeferred=false → biannual slot is "Teaching + Biannual" (on year, carries to next as skip)
function profTrackYear(
  prefix: string,
  roles: string[] = [],
  prefs: PlannerCoursePreference[] = [],
  biannualDeferred = false
): YearData {
  const released = roles.includes("Chair");
  return {
    facultyType: "Prof Track",
    roles,
    requestedLoad: released ? { summer: 0, fall: 0, spring: 0 } : { summer: 0, fall: 2, spring: 1 },
    semesterPlan: released
      ? { summer: [], fall: [], spring: [] }
      : {
          summer: [],
          fall: [
            slot(`${prefix}-f1`, "Teaching", "Regular"),
            biannualDeferred
              ? slot(`${prefix}-f2`, "Not Teaching", "Deferred or Taught Biannual")
              : slot(`${prefix}-f2`, "Teaching", "Biannual"),
          ],
          spring: [slot(`${prefix}-s1`, "Teaching", "Regular")],
        },
    coursePreferences: prefs,
  };
}

// biannualDeferred=true  → biannual slots are "Not Teaching + Deferred or Taught Biannual" (skip year)
// biannualDeferred=false → biannual slots are "Teaching + Biannual" (on year)
function lecture10Year(
  prefix: string,
  prefs: PlannerCoursePreference[] = [],
  biannualDeferred = false
): YearData {
  return {
    facultyType: "Lecture 10",
    roles: [],
    requestedLoad: { summer: 0, fall: 3, spring: 3 },
    semesterPlan: {
      summer: [],
      fall: [
        slot(`${prefix}-f1`, "Teaching", "Regular"),
        slot(`${prefix}-f2`, "Teaching", "Regular"),
        biannualDeferred
          ? slot(`${prefix}-f3`, "Not Teaching", "Deferred or Taught Biannual")
          : slot(`${prefix}-f3`, "Teaching", "Biannual"),
      ],
      spring: [
        slot(`${prefix}-s1`, "Teaching", "Regular"),
        slot(`${prefix}-s2`, "Teaching", "Regular"),
        biannualDeferred
          ? slot(`${prefix}-s3`, "Not Teaching", "Deferred or Taught Biannual")
          : slot(`${prefix}-s3`, "Teaching", "Biannual"),
      ],
    },
    coursePreferences: prefs,
  };
}

export const FACULTY_YEAR_DATA: Record<string, Record<string, YearData>> = {
  jsmith: {
    "2025-2026": {
      facultyType: "Prof Track",
      roles: ["Associate Chair"],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("js-25-f1", "Teaching", "Regular")],
        spring: [slot("js-25-s1", "Not Teaching", "Course Release")],
      },
      coursePreferences: [
        pref("js-cp1", "CSE521", "521LEC-Operating Systems", 5),
        pref("js-cp2", "CSE486", "486LEC-Distributed Systems", 5),
        pref("js-cp3", "CSE365", "365LR-Introduction to Computer Security", 4),
        pref("js-cp4", "CSE331", "331LR-Algorithms and Complexity", 3),
      ],
    },
    "2024-2025": {
      ...profTrackYear("js-24", ["Associate Chair"], [
        pref("js-24-cp1", "CSE521", "Operating Systems", 5),
        pref("js-24-cp2", "CSE486", "Distributed Systems", 4),
      ]),
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("js-24-f1", "Teaching", "Regular")],
        spring: [slot("js-24-s1", "Not Teaching", "Course Release")],
      },
    },
    "2023-2024": profTrackYear("js-23", [], [
      pref("js-23-cp1", "CSE521", "Operating Systems", 5),
    ]),
    // 2022-2023 is the skip (deferred) year so 2023-2024 gets Teaching + Biannual
    "2022-2023": profTrackYear("js-22", [], [], true),
  },

  abrown: {
    // 2025-2026: on year — Teaching + Biannual carried in from 2024-2025 Deferred
    "2025-2026": lecture10Year(
      "ab-25",
      [
        pref("ab-cp1", "CSE115", "115LLB-Introduction to Computer Science I", 5),
        pref("ab-cp2", "CSE116", "116LLB-Introduction to Computer Science II", 5),
        pref("ab-cp3", "CSE331", "331LR-Algorithms and Complexity", 4),
        pref("ab-cp4", "CSE431", "431LEC-Algorithms Analysis and Design", 4),
        pref("ab-cp5", "CSE250", "250LR-Data Structures", 3),
      ],
      false
    ),
    // 2024-2025: skip year — Deferred carries forward to 2025-2026 as Teaching
    "2024-2025": lecture10Year(
      "ab-24",
      [
        pref("ab-24-cp1", "CSE331", "331LR-Algorithms and Complexity", 5),
        pref("ab-24-cp2", "CSE431", "431LEC-Algorithms Analysis and Design", 4),
      ],
      true
    ),
    // 2023-2024: on year
    "2023-2024": lecture10Year("ab-23", [], false),
    // 2022-2023: skip year
    "2022-2023": lecture10Year("ab-22", [], true),
  },

  rlee: {
    // 2025-2026: on year — Teaching + Biannual carried in from 2024-2025 Deferred
    "2025-2026": profTrackYear(
      "rl-25",
      [],
      [
        pref("rl-cp1", "CSE474", "474LEC-Introduction to Machine Learning", 5),
        pref("rl-cp2", "CSE574", "574LEC-Introduction to Machine Learning", 5),
        pref("rl-cp3", "CSE368", "368LR-Introduction to Artificial Intelligence", 4),
        pref("rl-cp4", "CSE440", "440LEC-Machine Learning and Society for Majors", 3),
      ],
      false
    ),
    // 2024-2025: skip year — Deferred carries forward to 2025-2026 as Teaching
    "2024-2025": profTrackYear(
      "rl-24",
      [],
      [pref("rl-24-cp1", "CSE474", "Introduction to Machine Learning", 5)],
      true
    ),
    // 2023-2024: on year
    "2023-2024": profTrackYear("rl-23", [], [], false),
    // 2022-2023: skip year
    "2022-2023": profTrackYear("rl-22", [], [], true),
  },

  roshana: {
    "2025-2026": profTrackYear("ra-25", ["Chair"], [
      pref("ra-cp1", "CSE474", "474LEC-Introduction to Machine Learning", 5),
      pref("ra-cp2", "CSE574", "574LEC-Introduction to Machine Learning", 5),
      pref("ra-cp3", "CSE667", "667LEC-Advanced Topics in Computational Linguistics", 4),
    ]),
    "2024-2025": profTrackYear("ra-24", ["Chair"], [
      pref("ra-24-cp1", "CSE474", "Introduction to Machine Learning", 5),
    ]),
    // Pre-chair years follow the same alternating pattern
    "2023-2024": profTrackYear("ra-23", [], [], false),
    "2022-2023": profTrackYear("ra-22", [], [], true),
  },
};

export function getInitialYearDataForFaculty(
  userid: string
): Record<string, YearData> | null {
  return FACULTY_YEAR_DATA[userid] ?? null;
}
