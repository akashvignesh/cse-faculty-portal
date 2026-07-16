// Read-only rollups over the committee matrix data — grouped by faculty
// member ("By Name") or by committee ("By Committee"). Pure transforms only;
// callers are responsible for loading records/columns/memberships first
// (see committeeMatrixService.loadMatrixData).

import type { MatrixColumn } from "@/services/committee/committeeMatrixService";
import type { Faculty } from "@/types/faculty";

export type ReportRoleBucket = "chair" | "viceChair" | "member";

/**
 * Maps a matrix cell's UI code to a report bucket.
 * Role columns only ever hold "X" (holds the position) → Chair.
 * Committee columns: "R" (generic "role in committee") shares the DB code
 * ('P') with the role columns' holds-position marker, so it buckets as Chair
 * too; "C"/"V"/"M" map directly.
 */
export function bucketForCell(column: MatrixColumn, uiCode: string): ReportRoleBucket | null {
  if (!uiCode) return null;
  if (column.type === "role") {
    return uiCode === "X" ? "chair" : null;
  }
  switch (uiCode) {
    case "R":
    case "C":
      return "chair";
    case "V":
      return "viceChair";
    case "M":
      return "member";
    default:
      return null;
  }
}

export interface ByNameReportRow {
  userid: string;
  name: string;
  email: string;
  chair: string[];
  viceChair: string[];
  member: string[];
}

export function buildByNameReport(
  records: Faculty[],
  columns: MatrixColumn[],
  memberships: Record<string, string>
): ByNameReportRow[] {
  return records.map((person) => {
    const row: ByNameReportRow = {
      userid: person.userid,
      name: person.name,
      email: person.primaryEmail,
      chair: [],
      viceChair: [],
      member: [],
    };
    for (const column of columns) {
      const uiCode = memberships[`${person.userid}-${column.id}`] ?? "";
      const bucket = bucketForCell(column, uiCode);
      if (bucket) row[bucket].push(column.name);
    }
    return row;
  });
}

export interface ByCommitteeReportRow {
  committeeId: number;
  committeeName: string;
  chairs: string[];
  viceChairs: string[];
  members: string[];
}

export function buildByCommitteeReport(
  records: Faculty[],
  columns: MatrixColumn[],
  memberships: Record<string, string>
): ByCommitteeReportRow[] {
  return columns.map((column) => {
    const row: ByCommitteeReportRow = {
      committeeId: column.id,
      committeeName: column.name,
      chairs: [],
      viceChairs: [],
      members: [],
    };
    for (const person of records) {
      const uiCode = memberships[`${person.userid}-${column.id}`] ?? "";
      const bucket = bucketForCell(column, uiCode);
      if (bucket === "chair") row.chairs.push(person.name);
      else if (bucket === "viceChair") row.viceChairs.push(person.name);
      else if (bucket === "member") row.members.push(person.name);
    }
    return row;
  });
}
