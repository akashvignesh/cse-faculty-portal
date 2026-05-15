// Utility functions and constants for the Course Preference feature.
// Pure logic — no React imports or side effects.

// ── Faculty types ────────────────────────────────────────────────────────────
export const DEFAULT_ANNUAL_LOAD = {
  "Professor": 2,
  "Associate Professor": 2,
  "Assistant Professor": 2,
  "Adjunct": 2,
};

export const ALL_FACULTY_TYPES = Object.keys(DEFAULT_ANNUAL_LOAD);

// ── Faculty roles ─────────────────────────────────────────────────────────────
// Chair → full release (0 courses), Associate Chair / Director → 1 course/year
export const ALL_ROLES = ["Chair", "Associate Chair", "Director", "Other"];

// ── Computed annual load (role overrides type default) ───────────────────────
export function getComputedAnnualLoad(facultyType, roles = []) {
  if (roles.includes("Chair")) return 0;
  if (roles.includes("Associate Chair") || roles.includes("Director")) return 1;
  return DEFAULT_ANNUAL_LOAD[facultyType] ?? 2;
}

// ── Default per-semester distribution from annual load ───────────────────────
// Summer is always 0; fall gets the ceiling half, spring the floor half.
export function getDefaultSemesterDistribution(annualLoad) {
  return {
    summer: 0,
    fall: Math.ceil(annualLoad / 2),
    spring: Math.floor(annualLoad / 2),
  };
}

// ── Build a fresh semester plan matching a given requestedLoad ───────────────
export function buildDefaultSemesterPlan(requestedLoad) {
  const build = (count, prefix) =>
    Array.from({ length: count }, (_, i) => ({
      id: genId(prefix),
      status: "Teaching",
      comment: "",
    }));
  return {
    summer: build(requestedLoad.summer ?? 0, "sum"),
    fall: build(requestedLoad.fall ?? 0, "fall"),
    spring: build(requestedLoad.spring ?? 0, "sp"),
  };
}

// ── Semester planning ─────────────────────────────────────────────────────────
export const SEMESTER_STATUS_OPTIONS = ["Teaching", "Not Teaching"];

export const TEACHING_COMMENT_OPTIONS = ["Regular", "Biannual"];

export const NOT_TEACHING_COMMENT_OPTIONS = [
  "Deferred or Taught Biannual",
  "Course Buyout",
  "Course Release",
];

// ── Course preference ranking ─────────────────────────────────────────────────
export const RANKING_OPTIONS = [1, 2, 3, 4, 5];

export const RANKING_LABELS = {
  1: "1 – Least Preferred",
  2: "2",
  3: "3",
  4: "4",
  5: "5 – Most Preferred",
};

// ── Cross-semester load validation ────────────────────────────────────────────
export function validateSemesterPlan(semesterPlan, annualLoad) {
  const total =
    (semesterPlan.summer?.length ?? 0) +
    (semesterPlan.fall?.length ?? 0) +
    (semesterPlan.spring?.length ?? 0);

  const msgs = [];
  if (total < annualLoad) {
    msgs.push({
      type: "warning",
      message: `You have planned ${total} course slot${total !== 1 ? "s" : ""} but your standard annual load is ${annualLoad}. Add more slots to complete your plan.`,
    });
  } else if (total > annualLoad) {
    msgs.push({
      type: "warning",
      message: `You have planned ${total} course slots, which exceeds your standard annual load of ${annualLoad}.`,
    });
  }
  return msgs;
}

// ── ID generation ─────────────────────────────────────────────────────────────
export function genId(prefix = "row") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Deep copy ─────────────────────────────────────────────────────────────────
export function deepCopyYearData(data) {
  if (!data) return createEmptyYearData();
  return {
    facultyType: data.facultyType,
    roles: [...data.roles],
    requestedLoad: { ...data.requestedLoad },
    semesterPlan: {
      summer: data.semesterPlan.summer.map((r) => ({ ...r, id: genId("sum") })),
      fall: data.semesterPlan.fall.map((r) => ({ ...r, id: genId("fall") })),
      spring: data.semesterPlan.spring.map((r) => ({ ...r, id: genId("sp") })),
    },
    coursePreferences: data.coursePreferences.map((cp) => ({ ...cp, id: genId("cp") })),
  };
}

/** Returns a blank year data object. */
export function createEmptyYearData() {
  const defaultType = "Assistant Professor";
  const defaultRoles = [];
  const annualLoad = getComputedAnnualLoad(defaultType, defaultRoles);
  const requestedLoad = getDefaultSemesterDistribution(annualLoad);
  return {
    facultyType: defaultType,
    roles: defaultRoles,
    requestedLoad,
    semesterPlan: buildDefaultSemesterPlan(requestedLoad),
    coursePreferences: [],
  };
}

/** Derives the next academic year string (e.g. "2025-2026" → "2026-2027"). */
export function getNextYearString(yearStr) {
  const parts = yearStr.split("-");
  if (parts.length !== 2) return "";
  const start = parseInt(parts[0], 10);
  const end = parseInt(parts[1], 10);
  if (isNaN(start) || isNaN(end)) return "";
  return `${start + 1}-${end + 1}`;
}

// ── Legacy helpers kept for backward compatibility ────────────────────────────
export const MAX_LOAD_PER_SEMESTER = 3;
export const SUMMER_COUNTS_TOWARD_LOAD = {};

export function getDefaultLoad(facultyType) {
  return DEFAULT_ANNUAL_LOAD[facultyType] ?? 2;
}

export function getRoleAdjustment(roles) {
  if (roles.includes("Chair")) return "FULL_RELEASE";
  if (roles.includes("Associate Chair") || roles.includes("Director")) return 1;
  return 0;
}

export function getAdjustedLoad(defaultLoad, roleAdjustment) {
  if (roleAdjustment === "FULL_RELEASE") return 0;
  return Math.max(0, defaultLoad - roleAdjustment);
}
