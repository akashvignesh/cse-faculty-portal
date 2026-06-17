import { describe, expect, it } from "vitest";
import {
  addAcademicYear,
  applyBiannualCarryIn,
  buildDefaultSemesterPlan,
  createEmptyYearData,
  getAdjustedLoad,
  getBiannualCarryInSlots,
  getComputedAnnualLoad,
  getDefaultLoad,
  getDefaultSemesterDistribution,
  getNextYearString,
  getRoleAdjustment,
  resizeSemesterRows,
  validateLoadInputs,
  validateSemesterPlan,
} from "@/components/course-preference/coursePreferenceUtils";
import type { FacultyType, SemesterSlot, YearData } from "@/types/faculty";

function makeYearData(overrides: Partial<YearData> = {}): YearData {
  return { ...createEmptyYearData(), ...overrides };
}

function teachingSlot(id: string, comment = "Regular"): SemesterSlot {
  return { id, status: "Teaching", comment };
}

describe("getComputedAnnualLoad", () => {
  it("uses the faculty type default with no roles", () => {
    expect(getComputedAnnualLoad("Lecture 10")).toBe(6);
    expect(getComputedAnnualLoad("Lecture 12")).toBe(8);
    expect(getComputedAnnualLoad("Prof Track")).toBe(2.5);
  });

  it("gives Chair a 2.5-course reduction (PDF p3), not a full release", () => {
    expect(getComputedAnnualLoad("Lecture 12", ["Chair"])).toBe(5.5);
    expect(getComputedAnnualLoad("Lecture 10", ["Chair"])).toBe(3.5);
    // Prof Track lands at 0 because 2.5 − 2.5 = 0
    expect(getComputedAnnualLoad("Prof Track", ["Chair"])).toBe(0);
  });

  it("subtracts one course for each course-bearing directorship", () => {
    expect(getComputedAnnualLoad("Lecture 10", ["Director of Graduate Studies"])).toBe(5);
    expect(getComputedAnnualLoad("Lecture 10", ["Director of Undergraduate Studies"])).toBe(5);
    expect(getComputedAnnualLoad("Lecture 10", ["Director of Admissions"])).toBe(5);
  });

  it("applies no reduction for roles the PDF leaves unreduced", () => {
    expect(getComputedAnnualLoad("Lecture 10", ["Associate Chair"])).toBe(6);
    expect(getComputedAnnualLoad("Lecture 10", ["Director of Research"])).toBe(6);
    expect(getComputedAnnualLoad("Lecture 10", ["Center Director"])).toBe(6);
  });

  it("sums reductions across multiple roles", () => {
    expect(getComputedAnnualLoad("Lecture 12", ["Chair", "Director of Graduate Studies"])).toBe(
      4.5
    );
  });

  it("never goes below zero", () => {
    expect(getComputedAnnualLoad("Prof Track", ["Chair", "Director of Admissions"])).toBe(0);
  });
});

describe("legacy load helpers stay consistent with getComputedAnnualLoad", () => {
  it("getRoleAdjustment returns the summed release", () => {
    expect(getRoleAdjustment(["Chair"])).toBe(2.5);
    expect(getRoleAdjustment(["Director of Graduate Studies", "Director of Admissions"])).toBe(2);
    expect(getRoleAdjustment(["Associate Chair"])).toBe(0);
  });

  it("getAdjustedLoad(default, getRoleAdjustment(roles)) equals getComputedAnnualLoad", () => {
    const cases: { type: FacultyType; roles: string[] }[] = [
      { type: "Lecture 12", roles: ["Chair"] },
      { type: "Lecture 10", roles: ["Director of Graduate Studies"] },
      { type: "Prof Track", roles: ["Chair", "Director of Admissions"] },
      { type: "Lecture 10", roles: ["Associate Chair"] },
    ];
    for (const { type, roles } of cases) {
      expect(getAdjustedLoad(getDefaultLoad(type), getRoleAdjustment(roles))).toBe(
        getComputedAnnualLoad(type, roles)
      );
    }
  });
});

describe("getDefaultSemesterDistribution", () => {
  it("splits the rounded annual load fall-heavy with no summer", () => {
    expect(getDefaultSemesterDistribution(2.5)).toEqual({ summer: 0, fall: 2, spring: 1 });
    expect(getDefaultSemesterDistribution(6)).toEqual({ summer: 0, fall: 3, spring: 3 });
  });
});

describe("resizeSemesterRows", () => {
  it("keeps rows when the count matches", () => {
    const rows = [teachingSlot("a"), teachingSlot("b")];
    expect(resizeSemesterRows(rows, 2)).toBe(rows);
  });

  it("truncates when shrinking and appends fresh Teaching rows when growing", () => {
    const rows = [teachingSlot("a"), teachingSlot("b")];
    expect(resizeSemesterRows(rows, 1)).toHaveLength(1);

    const grown = resizeSemesterRows(rows, 3, "fall");
    expect(grown).toHaveLength(3);
    expect(grown[2]).toMatchObject({ status: "Teaching", comment: "" });
  });

  it("clamps to the per-semester maximum", () => {
    expect(resizeSemesterRows([], 99)).toHaveLength(3);
  });
});

describe("biannual carry-forward", () => {
  it("turns deferred slots into Teaching + Biannual the following year", () => {
    const prevYear = makeYearData({
      semesterPlan: {
        summer: [],
        fall: [
          teachingSlot("f1"),
          { id: "f2", status: "Not Teaching", comment: "Deferred or Taught Biannual" },
        ],
        spring: [teachingSlot("s1")],
      },
    });

    const carryIn = getBiannualCarryInSlots(prevYear);

    expect(carryIn.fall).toHaveLength(1);
    expect(carryIn.fall[0]).toMatchObject({ status: "Teaching", comment: "Biannual" });
    expect(carryIn.spring).toHaveLength(0);
  });

  it("turns Teaching + Biannual slots into deferred slots the following year", () => {
    const prevYear = makeYearData({
      semesterPlan: {
        summer: [],
        fall: [],
        spring: [{ id: "s1", status: "Teaching", comment: "Biannual" }],
      },
    });

    const carryIn = getBiannualCarryInSlots(prevYear);

    expect(carryIn.spring).toHaveLength(1);
    expect(carryIn.spring[0]).toMatchObject({
      status: "Not Teaching",
      comment: "Deferred or Taught Biannual",
    });
  });

  it("ignores summer slots entirely", () => {
    const prevYear = makeYearData({
      semesterPlan: {
        summer: [{ id: "su1", status: "Teaching", comment: "Biannual" }],
        fall: [],
        spring: [],
      },
    });

    const carryIn = getBiannualCarryInSlots(prevYear);
    expect(carryIn.fall).toHaveLength(0);
    expect(carryIn.spring).toHaveLength(0);
  });

  it("replaces existing biannual slots when injecting carry-in (no duplicates)", () => {
    const yearData = makeYearData({
      semesterPlan: {
        summer: [],
        fall: [teachingSlot("keep"), { id: "old", status: "Teaching", comment: "Biannual" }],
        spring: [],
      },
    });
    const carryIn = {
      fall: [{ id: "new", status: "Teaching", comment: "Biannual" } as SemesterSlot],
      spring: [],
    };

    const result = applyBiannualCarryIn(yearData, carryIn);

    expect(result.semesterPlan.fall.map((s) => s.id)).toEqual(["new", "keep"]);
  });

  it("sustains the alternating chain across two years", () => {
    // Year N: deferred → Year N+1: Teaching + Biannual → Year N+2: deferred again
    const yearN = makeYearData({
      semesterPlan: {
        summer: [],
        fall: [{ id: "n", status: "Not Teaching", comment: "Deferred or Taught Biannual" }],
        spring: [],
      },
    });

    const yearN1 = applyBiannualCarryIn(makeYearData(), getBiannualCarryInSlots(yearN));
    expect(yearN1.semesterPlan.fall[0]).toMatchObject({ status: "Teaching", comment: "Biannual" });

    const yearN2 = applyBiannualCarryIn(makeYearData(), getBiannualCarryInSlots(yearN1));
    expect(yearN2.semesterPlan.fall[0]).toMatchObject({
      status: "Not Teaching",
      comment: "Deferred or Taught Biannual",
    });
  });
});

describe("validateSemesterPlan", () => {
  it("warns when planned slots are below the expected load", () => {
    const messages = validateSemesterPlan(
      { summer: [], fall: [teachingSlot("f1")], spring: [] },
      3,
      "Prof Track"
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toMatch(/Add more slots/);
  });

  it("warns when planned slots exceed the expected load", () => {
    const messages = validateSemesterPlan(
      {
        summer: [],
        fall: [teachingSlot("f1"), teachingSlot("f2")],
        spring: [teachingSlot("s1")],
      },
      2,
      "Prof Track"
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toMatch(/exceeds/);
  });

  it("returns no messages when the plan matches", () => {
    expect(
      validateSemesterPlan({ summer: [], fall: [teachingSlot("f1")], spring: [] }, 1, "Prof Track")
    ).toEqual([]);
  });

  it("excludes summer slots from the total when summer does not count toward load", () => {
    // Lecture 10: a summer slot must not push a complete fall+spring plan over.
    const messages = validateSemesterPlan(
      {
        summer: [teachingSlot("su1")],
        fall: [teachingSlot("f1"), teachingSlot("f2"), teachingSlot("f3")],
        spring: [teachingSlot("s1"), teachingSlot("s2"), teachingSlot("s3")],
      },
      6,
      "Lecture 10"
    );
    expect(messages).toEqual([]);
  });

  it("counts summer slots toward the total for Lecture 12", () => {
    const matches = validateSemesterPlan(
      {
        summer: [teachingSlot("su1"), teachingSlot("su2")],
        fall: [teachingSlot("f1"), teachingSlot("f2"), teachingSlot("f3")],
        spring: [teachingSlot("s1"), teachingSlot("s2"), teachingSlot("s3")],
      },
      8,
      "Lecture 12"
    );
    expect(matches).toEqual([]);

    const short = validateSemesterPlan(
      {
        summer: [teachingSlot("su1")],
        fall: [teachingSlot("f1"), teachingSlot("f2"), teachingSlot("f3")],
        spring: [teachingSlot("s1"), teachingSlot("s2"), teachingSlot("s3")],
      },
      8,
      "Lecture 12"
    );
    expect(short).toHaveLength(1);
    expect(short[0]?.message).toMatch(/Add more slots/);
  });
});

describe("validateLoadInputs", () => {
  it("rejects values out of range and non half-course increments", () => {
    const messages = validateLoadInputs({ summer: 0, fall: 4, spring: 1.25 }, 6, "Lecture 10");
    const errors = messages.filter((m) => m.type === "error");
    expect(errors).toHaveLength(2);
    expect(errors.map((m) => m.field)).toEqual(["fall", "spring"]);
  });

  it("counts summer toward the total only for Lecture 12", () => {
    const l12 = validateLoadInputs({ summer: 2, fall: 3, spring: 3 }, 8, "Lecture 12");
    expect(l12.filter((m) => m.type === "warning")).toHaveLength(0);

    const l10 = validateLoadInputs({ summer: 2, fall: 3, spring: 3 }, 6, "Lecture 10");
    expect(l10.filter((m) => m.type === "warning")).toHaveLength(0);
  });
});

describe("getNextYearString", () => {
  it("advances an academic year string", () => {
    expect(getNextYearString("2025-2026")).toBe("2026-2027");
  });

  it("returns empty string for malformed input", () => {
    expect(getNextYearString("2025")).toBe("");
    expect(getNextYearString("abcd-efgh")).toBe("");
  });
});

describe("addAcademicYear", () => {
  const years = [
    { year: "2024-2025", locked: true },
    { year: "2025-2026", locked: false },
  ];

  it("locks all previous years and appends the next year unlocked", () => {
    const result = addAcademicYear(years, {
      "2025-2026": { ...createEmptyYearData(), roles: ["Chair"] },
    });
    expect(result).not.toBeNull();
    expect(result?.newYear).toBe("2026-2027");
    expect(result?.years).toEqual([
      { year: "2024-2025", locked: true },
      { year: "2025-2026", locked: true },
      { year: "2026-2027", locked: false },
    ]);
  });

  it("copies the latest year's faculty type and roles into the new year", () => {
    const result = addAcademicYear(years, {
      "2025-2026": { ...createEmptyYearData(), facultyType: "Lecture 10", roles: ["Chair"] },
    });
    expect(result?.yearData.facultyType).toBe("Lecture 10");
    expect(result?.yearData.roles).toEqual(["Chair"]);
  });

  it("returns null when the latest year string is malformed or the list is empty", () => {
    expect(addAcademicYear([{ year: "not-a-year", locked: false }], {})).toBeNull();
    expect(addAcademicYear([], {})).toBeNull();
  });
});

describe("buildDefaultSemesterPlan", () => {
  it("creates Teaching rows matching the requested load", () => {
    const plan = buildDefaultSemesterPlan({ summer: 0, fall: 2, spring: 1 });
    expect(plan.fall).toHaveLength(2);
    expect(plan.spring).toHaveLength(1);
    expect(plan.summer).toHaveLength(0);
    expect(plan.fall.every((s) => s.status === "Teaching")).toBe(true);
  });
});
