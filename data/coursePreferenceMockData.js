// Mock data for the redesigned Course Preference feature.
// This is frontend-only mock state — no backend persistence.

export const INITIAL_ACADEMIC_YEARS = [
  { year: "2022-2023", locked: true },
  { year: "2023-2024", locked: true },
  { year: "2024-2025", locked: true },
  { year: "2025-2026", locked: false },
];

// Shorthand builders to keep the data concise
function slot(id, status, comment) {
  return { id, status, comment };
}

function pref(id, courseCode, courseName, ranking) {
  return { id, courseCode, courseName, ranking };
}

export const FACULTY_YEAR_DATA = {
  jsmith: {
    "2025-2026": {
      facultyType: "Associate Professor",
      roles: ["Associate Chair"],
      requestedLoad: { summer: 0, fall: 1, spring: 0 },
      semesterPlan: {
        summer: [],
        fall: [slot("js-25-f1", "Teaching", "Regular")],
        spring: [],
      },
      coursePreferences: [
        pref("js-cp1", "CSE521", "521LEC-Operating Systems", 5),
        pref("js-cp2", "CSE486", "486LEC-Distributed Systems", 5),
        pref("js-cp3", "CSE365", "365LR-Introduction to Computer Security", 4),
        pref("js-cp4", "CSE331", "331LR-Algorithms and Complexity", 3),
      ],
    },
    "2024-2025": {
      facultyType: "Associate Professor",
      roles: ["Associate Chair"],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("js-24-f1", "Teaching", "Distributed Systems")],
        spring: [slot("js-24-s1", "Teaching", "Operating Systems")],
      },
      coursePreferences: [
        pref("js-24-cp1", "CSE521", "Operating Systems", 5),
        pref("js-24-cp2", "CSE486", "Distributed Systems", 4),
      ],
    },
    "2023-2024": {
      facultyType: "Associate Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("js-23-f1", "Teaching", "")],
        spring: [slot("js-23-s1", "Teaching", "")],
      },
      coursePreferences: [pref("js-23-cp1", "CSE521", "Operating Systems", 5)],
    },
    "2022-2023": {
      facultyType: "Associate Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("js-22-f1", "Teaching", "")],
        spring: [slot("js-22-s1", "Teaching", "")],
      },
      coursePreferences: [],
    },
  },

  abrown: {
    "2025-2026": {
      facultyType: "Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("ab-25-f1", "Teaching", "Regular")],
        spring: [slot("ab-25-s1", "Teaching", "Regular")],
      },
      coursePreferences: [
        pref("ab-cp1", "CSE115LLB-Introduction to Computer Science I", "CSE115LLB-Introduction to Computer Science I", 5),
        pref("ab-cp2", "CSE116LLB-Introduction to Computer Science II", "CSE116LLB-Introduction to Computer Science II", 5),
        pref("ab-cp3", "CSE331LR-Algorithms and Complexity", "CSE331LR-Algorithms and Complexity", 4),
        pref("ab-cp4", "CSE431LEC-Algorithms Analysis and Design", "CSE431LEC-Algorithms Analysis and Design", 4),
        pref("ab-cp5", "CSE250LR-Data Structures", "CSE250LR-Data Structures", 3),
      ],
    },
    "2024-2025": {
      facultyType: "Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("ab-24-f1", "Teaching", "Regular")],
        spring: [slot("ab-24-s1", "Teaching", "Regular")],
      },
      coursePreferences: [
        pref("ab-24-cp1", "CSE331LR-Algorithms and Complexity", "CSE331LR-Algorithms and Complexity", 5),
        pref("ab-24-cp2", "CSE431LEC-Algorithms Analysis and Design", "CSE431LEC-Algorithms Analysis and Design", 4),
      ],
    },
    "2023-2024": {
      facultyType: "Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("ab-23-f1", "Teaching", "")],
        spring: [slot("ab-23-s1", "Teaching", "")],
      },
      coursePreferences: [],
    },
    "2022-2023": {
      facultyType: "Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("ab-22-f1", "Teaching", "")],
        spring: [slot("ab-22-s1", "Teaching", "")],
      },
      coursePreferences: [],
    },
  },

  rlee: {
    "2025-2026": {
      facultyType: "Assistant Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("rl-25-f1", "Teaching", "Regular")],
        spring: [slot("rl-25-s1", "Teaching", "Regular")],
      },
      coursePreferences: [
        pref("rl-cp1", "CSE474", "474LEC-Introduction to Machine Learning", 5),
        pref("rl-cp2", "CSE574", "574LEC-Introduction to Machine Learning", 5),
        pref("rl-cp3", "CSE368", "368LR-Introduction to Artificial Intelligence", 4),
        pref("rl-cp4", "CSE440", "440LEC-Machine Learning and Society for Majors", 3),
      ],
    },
    "2024-2025": {
      facultyType: "Assistant Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("rl-24-f1", "Teaching", "")],
        spring: [slot("rl-24-s1", "Teaching", "")],
      },
      coursePreferences: [pref("rl-24-cp1", "CSE474", "Introduction to Machine Learning", 5)],
    },
    "2023-2024": {
      facultyType: "Assistant Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("rl-23-f1", "Teaching", "")],
        spring: [slot("rl-23-s1", "Teaching", "")],
      },
      coursePreferences: [],
    },
    "2022-2023": {
      facultyType: "Assistant Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("rl-22-f1", "Teaching", "")],
        spring: [slot("rl-22-s1", "Teaching", "")],
      },
      coursePreferences: [],
    },
  },

  roshana: {
    "2025-2026": {
      facultyType: "Assistant Professor",
      roles: ["Chair"],
      requestedLoad: { summer: 0, fall: 0, spring: 0 },
      semesterPlan: { summer: [], fall: [], spring: [] },
      coursePreferences: [
        pref("ra-cp1", "CSE474", "474LEC-Introduction to Machine Learning", 5),
        pref("ra-cp2", "CSE574", "574LEC-Introduction to Machine Learning", 5),
        pref("ra-cp3", "CSE667", "667LEC-Advanced Topics in Computational Linguistics", 4),
      ],
    },
    "2024-2025": {
      facultyType: "Assistant Professor",
      roles: ["Chair"],
      requestedLoad: { summer: 0, fall: 0, spring: 0 },
      semesterPlan: { summer: [], fall: [], spring: [] },
      coursePreferences: [
        pref("ra-24-cp1", "CSE474", "Introduction to Machine Learning", 5),
      ],
    },
    "2023-2024": {
      facultyType: "Assistant Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("ra-23-f1", "Teaching", "")],
        spring: [slot("ra-23-s1", "Teaching", "")],
      },
      coursePreferences: [],
    },
    "2022-2023": {
      facultyType: "Assistant Professor",
      roles: [],
      requestedLoad: { summer: 0, fall: 1, spring: 1 },
      semesterPlan: {
        summer: [],
        fall: [slot("ra-22-f1", "Teaching", "")],
        spring: [slot("ra-22-s1", "Teaching", "")],
      },
      coursePreferences: [],
    },
  },
};

export function getInitialYearDataForFaculty(userid) {
  return FACULTY_YEAR_DATA[userid] ?? null;
}
