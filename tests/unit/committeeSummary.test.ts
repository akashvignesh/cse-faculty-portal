import { describe, expect, it } from "vitest";
import {
  computeServicePoints,
  countChairs,
  countCommittees,
  countOthers,
  formatServicePoints,
  type SummaryColumnInput,
} from "@/services/committee/committeeSummary";

// Mirrors the workbook layout: leadership (G:K), dept committees + task
// forces (M:AM), SEAS/pools (AO:AT).
const columns: SummaryColumnInput[] = [
  { id: 1, kind: "leadership", servicePoints: 15 }, // Chair
  { id: 2, kind: "leadership", servicePoints: 8 }, // Associate Chair
  { id: 10, kind: "committee", servicePoints: 3 }, // Grad Admissions
  { id: 12, kind: "committee", servicePoints: 2 }, // Colloquium
  { id: 28, kind: "taskforce", servicePoints: 3 }, // Task force
  { id: 31, kind: "seas", servicePoints: 1 }, // SEAS committee
  { id: 34, kind: "pool", servicePoints: 1 }, // Grievance pool
];

function cells(map: Record<number, string>) {
  return (id: number) => map[id] ?? "";
}

describe("committeeSummary (workbook formulas)", () => {
  const getCell = cells({ 2: "X", 10: "C", 12: "V", 28: "M", 31: "M", 34: "M" });

  it("# of Chairs counts C over dept committees/task forces only", () => {
    // C on Grad Admissions counts; X on Associate Chair does not.
    expect(countChairs(columns, getCell)).toBe(1);
    expect(countChairs(columns, cells({ 1: "X" }))).toBe(0);
  });

  it("# of Committees counts non-empty dept cells only", () => {
    // Grad Admissions (C), Colloquium (V), task force (M) — not leadership/SEAS/pool.
    expect(countCommittees(columns, getCell)).toBe(3);
  });

  it("# of Others counts leadership + SEAS/pool entries", () => {
    // Associate Chair (X), SEAS (M), pool (M).
    expect(countOthers(columns, getCell)).toBe(3);
  });

  it("Service Points weighs C 3x, V 2x, others 1x against column points", () => {
    // X:8 + C:3×3 + V:2×2 + M:3 + M:1 + M:1 = 8 + 9 + 4 + 5 = 26
    expect(computeServicePoints(columns, getCell)).toBe(26);
  });

  it("R weighs 1x (workbook code P)", () => {
    expect(computeServicePoints(columns, cells({ 10: "R" }))).toBe(3);
  });

  it("treats columns without points as 0", () => {
    const noPoints: SummaryColumnInput[] = [{ id: 5, kind: "committee", servicePoints: null }];
    expect(computeServicePoints(noPoints, cells({ 5: "C" }))).toBe(0);
  });

  it("formats whole points plainly and fractions to 2 dp", () => {
    expect(formatServicePoints(26)).toBe("26");
    expect(formatServicePoints(7.5)).toBe("7.50");
  });
});
