// Computed summary columns of the committee matrix, replicating the formulas
// of the 2026 CSE Service workbook (Committees-F25):
//
//   # of Chairs     =COUNTIF(M:AM,"C")            → C over dept columns
//   # of Committees =COUNTIFS(M:AM,"*?*")         → non-empty over dept columns
//   # of Others     =COUNTIFS(G:K)+COUNTIFS(AO:AT) → non-empty over leadership
//                                                    + SEAS/pool columns
//   Service Points  =SUMIF(...,"P")+3*SUMIF("C")+2*SUMIF("V")+SUMIF("X")
//                    → per-cell weight × the column's service points
//
// "Dept" columns are the department's own committees and task forces (workbook
// range M:AM); leadership (G:K) and SEAS/pools (AO:AT) count as "Others".
// Pure module (no server-only, no fetch) so it is unit-testable and shared by
// the matrix view and reports.

import type { MatrixCellCode } from "@/lib/committeeRoles";

export type CommitteeKind = "leadership" | "committee" | "taskforce" | "seas" | "pool";

export const COMMITTEE_KINDS: readonly CommitteeKind[] = [
  "leadership",
  "committee",
  "taskforce",
  "seas",
  "pool",
];

/** Columns counted by "# of Chairs" / "# of Committees" (workbook M:AM). */
const DEPT_KINDS: ReadonlySet<CommitteeKind> = new Set(["committee", "taskforce"]);
/** Columns counted by "# of Others" (workbook G:K + AO:AT). */
const OTHER_KINDS: ReadonlySet<CommitteeKind> = new Set(["leadership", "seas", "pool"]);

/**
 * Service-point multiplier per cell code (workbook AY column):
 * Chair 3×, Vice Chair 2×, member/role/position 1×.
 */
export const CELL_WEIGHTS: Readonly<Record<Exclude<MatrixCellCode, "">, number>> = {
  C: 3,
  V: 2,
  R: 1,
  M: 1,
  X: 1,
};

export interface SummaryColumnInput {
  id: number;
  kind: CommitteeKind;
  servicePoints: number | null;
}

type GetCell = (committeeId: number) => string;

export function countChairs(columns: SummaryColumnInput[], getCell: GetCell): number {
  return columns.filter((col) => DEPT_KINDS.has(col.kind) && getCell(col.id) === "C").length;
}

export function countCommittees(columns: SummaryColumnInput[], getCell: GetCell): number {
  return columns.filter((col) => DEPT_KINDS.has(col.kind) && Boolean(getCell(col.id))).length;
}

export function countOthers(columns: SummaryColumnInput[], getCell: GetCell): number {
  return columns.filter((col) => OTHER_KINDS.has(col.kind) && Boolean(getCell(col.id))).length;
}

export function computeServicePoints(columns: SummaryColumnInput[], getCell: GetCell): number {
  let total = 0;
  for (const col of columns) {
    const code = getCell(col.id) as MatrixCellCode;
    if (!code) continue;
    const weight = CELL_WEIGHTS[code as Exclude<MatrixCellCode, "">] ?? 0;
    total += weight * (col.servicePoints ?? 0);
  }
  return total;
}

/** Formats computed service points (integers plain, fractions to 2 dp). */
export function formatServicePoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(2);
}
