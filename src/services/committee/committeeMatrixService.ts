// Client-side data layer for the committee preference matrix.
//
// In db mode the matrix loads its columns from cfp_committee_catalog and its
// cells from cfp_committee_assignment via the Editor-protocol routes, and
// saves by diffing the in-memory state into batched create/edit/remove
// submits. In local mock mode (editor routes answer 503) it falls back to the
// bundled mock data and saves are acknowledged without persistence.

import { committeeList, committeeMembershipData } from "@/data/committeeMockData";
import { editorLoad, editorSubmit, EditorError } from "@/lib/editor/client";

export interface MatrixColumn {
  /** cfp_committee_catalog.catalog_id (db) or mock committee id (local). */
  id: number;
  name: string;
  type: "role" | "committee";
  category: number | null;
  servicePoints: number | null;
}

/** UI cell codes: "X" on role columns, "R"/"C"/"V"/"M" on committee columns. */
export type MatrixCellCode = "" | "X" | "R" | "C" | "V" | "M";

export interface LoadedAssignment {
  assignmentId: string;
  userid: string;
  catalogId: number;
  uiCode: MatrixCellCode;
}

export interface LoadedSummary {
  summaryId: string;
  userid: string;
  others: string;
  servicePoints: string;
  comments: string;
}

export interface MatrixData {
  source: "db" | "mock";
  columns: MatrixColumn[];
  assignments: LoadedAssignment[];
  summaries: LoadedSummary[];
}

const ASSIGNMENTS_URL = "/api/editor/committee-assignments";
const CATALOG_URL = "/api/editor/committee-catalog";
const SUMMARY_URL = "/api/editor/service-summary";
const CATEGORIES_URL = "/api/editor/service-categories";

const ASSIGN_TABLE = "cfp_committee_assignment";
const SUMMARY_TABLE = "cfp_committee_service_summary";

// DB role_code ENUM('P','C','V','X','A') ↔ UI codes.
function dbToUiCode(roleCode: string, columnType: "role" | "committee"): MatrixCellCode {
  if (columnType === "role") {
    return roleCode === "P" ? "X" : "";
  }
  switch (roleCode) {
    case "P":
      return "R";
    case "C":
      return "C";
    case "V":
      return "V";
    default:
      // Members and alternates both display as Member.
      return "M";
  }
}

function uiToDbCode(uiCode: MatrixCellCode): string {
  switch (uiCode) {
    case "X":
    case "R":
      return "P";
    case "C":
      return "C";
    case "V":
      return "V";
    default:
      return "X"; // Member
  }
}

interface CatalogRow {
  DT_RowId?: string;
  cfp_committee_catalog?: {
    catalog_id: number | string;
    name: string;
    kind: string | null;
    service_category: number | string | null;
    display_order: number | string | null;
  };
}

interface AssignmentRow {
  DT_RowId?: string;
  cfp_committee_assignment?: {
    assignment_id: number | string;
    catalog_id: number | string;
    userid: string;
    role_code: string;
    academic_year: string;
  };
}

interface SummaryRow {
  DT_RowId?: string;
  cfp_committee_service_summary?: {
    service_summary_id: number | string;
    userid: string;
    others_count: number | string | null;
    service_points_override: number | string | null;
    comments: string | null;
  };
}

function mockMatrixData(): MatrixData {
  return {
    source: "mock",
    columns: committeeList.map((committee) => ({
      id: committee.id,
      name: committee.name,
      type: committee.type === "role" ? "role" : "committee",
      category: committee.category ?? null,
      servicePoints: committee.servicePoints ?? null,
    })),
    assignments: committeeMembershipData.map((membership, index) => ({
      assignmentId: `mock-${index}`,
      userid: membership.userid,
      catalogId: membership.committeeId,
      uiCode: (membership.role || "") as MatrixCellCode,
    })),
    summaries: [],
  };
}

async function fetchCategoryPoints(): Promise<Map<number, number>> {
  try {
    const response = await fetch(CATEGORIES_URL, { headers: { Accept: "application/json" } });
    const payload = (await response.json()) as {
      data?: { category: number; points: number }[];
    };
    return new Map((payload.data ?? []).map((row) => [row.category, Number(row.points)]));
  } catch {
    return new Map();
  }
}

export async function loadMatrixData(academicYear: string): Promise<MatrixData> {
  let catalogRows: CatalogRow[];
  try {
    catalogRows = await editorLoad<CatalogRow>(CATALOG_URL);
  } catch (error) {
    if (error instanceof EditorError) {
      // Local mock mode (or editor backend unavailable): serve bundled data.
      return mockMatrixData();
    }
    throw error;
  }

  const categoryPoints = await fetchCategoryPoints();

  const columns: MatrixColumn[] = catalogRows
    .map((row) => row.cfp_committee_catalog)
    .filter((catalog): catalog is NonNullable<CatalogRow["cfp_committee_catalog"]> =>
      Boolean(catalog)
    )
    .map((catalog) => {
      const category =
        catalog.service_category === null || catalog.service_category === ""
          ? null
          : Number(catalog.service_category);
      return {
        id: Number(catalog.catalog_id),
        name: catalog.name,
        type: (catalog.kind === "leadership" ? "role" : "committee") as "role" | "committee",
        category,
        servicePoints: category !== null ? (categoryPoints.get(category) ?? null) : null,
        displayOrder:
          catalog.display_order === null || catalog.display_order === ""
            ? Number.MAX_SAFE_INTEGER
            : Number(catalog.display_order),
      };
    })
    .sort((a, b) => (a as { displayOrder: number }).displayOrder - (b as { displayOrder: number }).displayOrder)
    .map(({ id, name, type, category, servicePoints }) => ({
      id,
      name,
      type,
      category,
      servicePoints,
    }));

  const columnTypeById = new Map(columns.map((column) => [column.id, column.type]));

  const [assignmentRows, summaryRows] = await Promise.all([
    editorLoad<AssignmentRow>(`${ASSIGNMENTS_URL}?academic_year=${encodeURIComponent(academicYear)}`),
    editorLoad<SummaryRow>(`${SUMMARY_URL}?academic_year=${encodeURIComponent(academicYear)}`),
  ]);

  const assignments: LoadedAssignment[] = assignmentRows
    .map((row) => {
      const assignment = row.cfp_committee_assignment;
      if (!assignment) return null;
      const catalogId = Number(assignment.catalog_id);
      return {
        assignmentId: row.DT_RowId ?? `row_${assignment.assignment_id}`,
        userid: assignment.userid,
        catalogId,
        uiCode: dbToUiCode(assignment.role_code, columnTypeById.get(catalogId) ?? "committee"),
      };
    })
    .filter((assignment): assignment is LoadedAssignment => assignment !== null);

  const summaries: LoadedSummary[] = summaryRows
    .map((row) => {
      const summary = row.cfp_committee_service_summary;
      if (!summary) return null;
      return {
        summaryId: row.DT_RowId ?? `row_${summary.service_summary_id}`,
        userid: summary.userid,
        others: summary.others_count === null ? "" : String(summary.others_count),
        servicePoints:
          summary.service_points_override === null ? "" : String(summary.service_points_override),
        comments: summary.comments ?? "",
      };
    })
    .filter((summary): summary is LoadedSummary => summary !== null);

  return { source: "db", columns, assignments, summaries };
}

export interface SaveMatrixInput {
  academicYear: string;
  /** Current cell state keyed `${userid}-${catalogId}` → UI code. */
  memberships: Record<string, string>;
  /** Assignments as loaded (the diff baseline). */
  loadedAssignments: LoadedAssignment[];
  /** Current summary extras keyed by userid. */
  extras: Record<string, Record<string, string>>;
  loadedSummaries: LoadedSummary[];
}

export interface SaveMatrixResult {
  created: number;
  updated: number;
  removed: number;
  summariesSaved: number;
}

export async function saveMatrix(input: SaveMatrixInput): Promise<SaveMatrixResult> {
  const { academicYear, memberships, loadedAssignments, extras, loadedSummaries } = input;

  const baseline = new Map(
    loadedAssignments.map((assignment) => [
      `${assignment.userid}-${assignment.catalogId}`,
      assignment,
    ])
  );

  const creates: Record<string, Record<string, unknown>> = {};
  const edits: Record<string, Record<string, unknown>> = {};
  const removes: Record<string, Record<string, unknown>> = {};
  let createIndex = 0;

  const seenKeys = new Set<string>();
  for (const [key, uiCode] of Object.entries(memberships)) {
    seenKeys.add(key);
    const separatorIndex = key.lastIndexOf("-");
    const userid = key.slice(0, separatorIndex);
    const catalogId = Number(key.slice(separatorIndex + 1));
    const existing = baseline.get(key);

    if (uiCode && !existing) {
      creates[String(createIndex++)] = {
        [ASSIGN_TABLE]: {
          catalog_id: catalogId,
          userid,
          role_code: uiToDbCode(uiCode as MatrixCellCode),
          academic_year: academicYear,
        },
      };
    } else if (uiCode && existing && existing.uiCode !== uiCode) {
      edits[existing.assignmentId] = {
        [ASSIGN_TABLE]: { role_code: uiToDbCode(uiCode as MatrixCellCode) },
      };
    } else if (!uiCode && existing) {
      removes[existing.assignmentId] = {};
    }
  }
  for (const [key, existing] of baseline) {
    if (!seenKeys.has(key)) {
      removes[existing.assignmentId] = {};
    }
  }

  if (Object.keys(creates).length > 0) {
    await editorSubmit(ASSIGNMENTS_URL, "create", creates);
  }
  if (Object.keys(edits).length > 0) {
    await editorSubmit(ASSIGNMENTS_URL, "edit", edits);
  }
  if (Object.keys(removes).length > 0) {
    await editorSubmit(ASSIGNMENTS_URL, "remove", removes);
  }

  // Summaries: upsert one row per userid that has any manual value.
  const summaryBaseline = new Map(loadedSummaries.map((summary) => [summary.userid, summary]));
  const summaryCreates: Record<string, Record<string, unknown>> = {};
  const summaryEdits: Record<string, Record<string, unknown>> = {};
  let summaryIndex = 0;

  for (const [userid, values] of Object.entries(extras)) {
    const others = values.others ?? "";
    const servicePoints = values.servicePoints ?? "";
    const comments = values.comments ?? "";
    const existing = summaryBaseline.get(userid);
    const isEmpty = !others && !servicePoints && !comments;

    const payload = {
      [SUMMARY_TABLE]: {
        userid,
        academic_year: academicYear,
        others_count: others === "" ? null : Number(others),
        service_points_override: servicePoints === "" ? null : Number(servicePoints),
        comments,
      },
    };

    if (existing) {
      const changed =
        existing.others !== others ||
        existing.servicePoints !== servicePoints ||
        existing.comments !== comments;
      if (changed) {
        summaryEdits[existing.summaryId] = payload;
      }
    } else if (!isEmpty) {
      summaryCreates[String(summaryIndex++)] = payload;
    }
  }

  let summariesSaved = 0;
  if (Object.keys(summaryCreates).length > 0) {
    await editorSubmit(SUMMARY_URL, "create", summaryCreates);
    summariesSaved += Object.keys(summaryCreates).length;
  }
  if (Object.keys(summaryEdits).length > 0) {
    await editorSubmit(SUMMARY_URL, "edit", summaryEdits);
    summariesSaved += Object.keys(summaryEdits).length;
  }

  return {
    created: Object.keys(creates).length,
    updated: Object.keys(edits).length,
    removed: Object.keys(removes).length,
    summariesSaved,
  };
}
