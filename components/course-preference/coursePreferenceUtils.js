// Utility functions and constants for the Course Preference feature.
// Pure logic — no React imports or side effects.

// ── Faculty types ────────────────────────────────────────────────────────────
export const DEFAULT_ANNUAL_LOAD = {
  "Lecture 10": 6,
  "Lecture 12": 8,
  "Prof Track": 2.5,
};

export const ALL_FACULTY_TYPES = Object.keys(DEFAULT_ANNUAL_LOAD);

// ── Faculty roles ─────────────────────────────────────────────────────────────
// Chair → full release (0 courses), Associate Chair / Director → 1 course/year
export const ALL_ROLES = ["Chair", "Associate Chair", "Director", "Other"];

export const ROLE_ADJUSTMENTS_CONFIG = [
  { role: "Chair", adjustment: "FULL_RELEASE" },
  { role: "Associate Chair", adjustment: 1 },
  { role: "Director", adjustment: 1 },
];

// ── Computed annual load (role overrides type default) ───────────────────────
export function getComputedAnnualLoad(facultyType, roles = []) {
  if (roles.includes("Chair")) return 0;
  const defaultLoad = getDefaultLoad(facultyType);
  const release = roles.reduce((total, role) => {
    const adjustment = ROLE_ADJUSTMENTS_CONFIG.find((item) => item.role === role)?.adjustment;
    return typeof adjustment === "number" ? total + adjustment : total;
  }, 0);
  return Math.max(0, defaultLoad - release);
}

// ── Default per-semester distribution from annual load ───────────────────────
// Summer is always 0; fall gets the ceiling half, spring the floor half.
export function getDefaultSemesterDistribution(annualLoad) {
  const roundedLoad = Math.ceil(annualLoad);
  return {
    summer: 0,
    fall: Math.ceil(roundedLoad / 2),
    spring: Math.floor(roundedLoad / 2),
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

export function resizeSemesterRows(rows = [], requestedCount = 0, prefix = "row") {
  const count = Math.ceil(
    Math.max(0, Math.min(MAX_LOAD_PER_SEMESTER, Number(requestedCount) || 0))
  );
  if (rows.length === count) return rows;
  if (rows.length > count) return rows.slice(0, count);
  const addedRows = Array.from({ length: count - rows.length }, () => ({
    id: genId(prefix),
    status: "Teaching",
    comment: "",
  }));
  return [...rows, ...addedRows];
}

export function syncSemesterPlanToRequestedLoad(semesterPlan, requestedLoad) {
  return {
    summer: resizeSemesterRows(semesterPlan?.summer, requestedLoad?.summer, "sum"),
    fall: resizeSemesterRows(semesterPlan?.fall, requestedLoad?.fall, "fall"),
    spring: resizeSemesterRows(semesterPlan?.spring, requestedLoad?.spring, "sp"),
  };
}

// ── Semester planning ─────────────────────────────────────────────────────────
export const SEMESTER_STATUS_OPTIONS = ["Teaching", "Not Teaching"];

export const TEACHING_COMMENT_OPTIONS = ["Regular", "Biannual"];

export const NOT_TEACHING_COMMENT_OPTIONS = [
  "Sabbatical – Year (SY)",
  "Sabbatical – Semester (SS)",
  "Leave without Pay (LWOP)",
  "Paid Leave (PL)",
  "Deferred or Taught Biannual",
  "Course Buyout",
  "Course Release",
];

// ── Course preference ranking ─────────────────────────────────────────────────
export const RANKING_OPTIONS = [0, 1, 2, 3, 4, 5];

export const RANKING_LABELS = {
  0: "Not Qualified (NQ)",
  1: "1 – Least Preferred",
  2: "2",
  3: "3",
  4: "4",
  5: "5 – Most Preferred",
};

// ── Cross-semester load validation ────────────────────────────────────────────
export function validateSemesterPlan(semesterPlan, annualLoad) {
  const expectedLoad = Math.ceil(annualLoad);
  const total =
    (semesterPlan.summer?.length ?? 0) +
    (semesterPlan.fall?.length ?? 0) +
    (semesterPlan.spring?.length ?? 0);

  const msgs = [];
  if (total < expectedLoad) {
    msgs.push({
      type: "warning",
      message: `You have planned ${total} course slot${total !== 1 ? "s" : ""} but your standard annual load rounds to ${expectedLoad}. Add more slots to complete your plan.`,
    });
  } else if (total > expectedLoad) {
    msgs.push({
      type: "warning",
      message: `You have planned ${total} course slots, which exceeds your standard annual load of ${expectedLoad}.`,
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
  const defaultType = "Prof Track";
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
export const SUMMER_COUNTS_TOWARD_LOAD = {
  "Lecture 10": false,
  "Lecture 12": true,
  "Prof Track": false,
};

export function getDefaultLoad(facultyType) {
  return DEFAULT_ANNUAL_LOAD[facultyType] ?? DEFAULT_ANNUAL_LOAD["Prof Track"];
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

export function getTotalRequestedLoad(requestedLoad, facultyType) {
  const countsSummer = SUMMER_COUNTS_TOWARD_LOAD[facultyType] ?? false;
  return (
    (countsSummer ? Number(requestedLoad?.summer ?? 0) : 0) +
    Number(requestedLoad?.fall ?? 0) +
    Number(requestedLoad?.spring ?? 0)
  );
}

export function validateLoadInputs(requestedLoad, adjustedLoad, facultyType) {
  const messages = [];
  for (const field of ["summer", "fall", "spring"]) {
    const value = Number(requestedLoad?.[field] ?? 0);
    if (value < 0 || value > MAX_LOAD_PER_SEMESTER) {
      messages.push({
        field,
        type: "error",
        message: "Enter a value from 0 to 3.",
      });
    } else if ((value * 2) % 1 !== 0) {
      messages.push({
        field,
        type: "error",
        message: "Use half-course increments, such as 0, 0.5, 1, or 1.5.",
      });
    }
  }

  const total = getTotalRequestedLoad(requestedLoad, facultyType);
  const expected = adjustedLoad;
  if (total < expected) {
    messages.push({
      field: "total",
      type: "warning",
      message: `Requested teaching load is ${total}, below the expected ${expected}.`,
    });
  } else if (total > expected) {
    messages.push({
      field: "total",
      type: "warning",
      message: `Requested teaching load is ${total}, above the expected ${expected}.`,
    });
  }
  return messages;
}
