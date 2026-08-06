// Client-side data layer for the committee preference matrix.
//
// In db mode the matrix loads its columns from committees.committees (with
// kind/category metadata from the ubs_emp.cfp_committee_catalog overlay) and
// its cells from committees.members via the /api/editor routes, and saves by
// diffing the in-memory state into batched create/edit/remove submits. The
// manual Comments column persists in cfp_committee_service_summary; the other
// summary columns (# of Chairs / Committees / Others, Service Points) are
// computed live with the workbook formulas (see committeeSummary.ts).
// In local mock mode (editor routes answer 503) it falls back to the bundled
// mock data and saves are acknowledged without persistence.

import { committeeList, committeeMembershipData } from "@/data/committeeMockData";
import { dbRoleToUiCode, uiCodeToDbRole, type MatrixCellCode } from "@/lib/committeeRoles";
import { editorLoad, editorSubmit, EditorError } from "@/lib/editor/client";
import type { CommitteeKind } from "@/services/committee/committeeSummary";

export type { MatrixCellCode };

export interface MatrixColumn {
  /** committees.committees.id (db) or mock committee id (local). */
  id: number;
  name: string;
  type: "role" | "committee";
  kind: CommitteeKind;
  category: number | null;
  servicePoints: number | null;
}

export interface LoadedAssignment {
  assignmentId: string;
  userid: string;
  catalogId: number;
  uiCode: MatrixCellCode;
}

export interface LoadedSummary {
  summaryId: string;
  userid: string;
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

const ASSIGN_TABLE = "members";
const SUMMARY_TABLE = "cfp_committee_service_summary";

interface ColumnMeta {
  kind: CommitteeKind;
  category: number | null;
  servicePoints: number | null;
  order: number;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Name-keyed fallback metadata for committees without an overlay row. */
const COLUMN_META: ReadonlyMap<string, ColumnMeta> = new Map(
  committeeList.map((committee, index) => [
    normalizeName(committee.name),
    {
      kind: committee.kind as CommitteeKind,
      category: committee.category ?? null,
      servicePoints: committee.servicePoints ?? null,
      order: index,
    },
  ])
);

interface CommitteeRow {
  DT_RowId?: string;
  committees?: {
    id: number | string;
    name: string;
    cms_display?: number | string | null;
  };
  cfp_committee_catalog?: {
    kind: string | null;
    service_category: number | string | null;
    display_order: number | string | null;
  };
}

interface MemberRow {
  DT_RowId?: string;
  members?: {
    id: number | string;
    committee_id: number | string;
    userid: string;
    role: string | null;
  };
}

interface SummaryRow {
  DT_RowId?: string;
  cfp_committee_service_summary?: {
    service_summary_id: number | string;
    userid: string;
    comments: string | null;
  };
}

function mockMatrixData(): MatrixData {
  return {
    source: "mock",
    columns: committeeList.map((committee) => ({
      id: committee.id,
      name: committee.name,
      type: committee.kind === "leadership" ? "role" : "committee",
      kind: committee.kind as CommitteeKind,
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

export interface ServiceCategory {
  category: number;
  label: string;
  points: number;
}

export async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  try {
    const response = await fetch(CATEGORIES_URL, { headers: { Accept: "application/json" } });
    const payload = (await response.json()) as { data?: ServiceCategory[] };
    return (payload.data ?? []).map((row) => ({
      category: Number(row.category),
      label: row.label,
      points: Number(row.points),
    }));
  } catch {
    return [];
  }
}

export async function loadMatrixData(academicYear: string): Promise<MatrixData> {
  let committeeRows: CommitteeRow[];
  try {
    committeeRows = await editorLoad<CommitteeRow>(CATALOG_URL);
  } catch (error) {
    if (error instanceof EditorError) {
      // Local mock mode (or editor backend unavailable): serve bundled data.
      return mockMatrixData();
    }
    throw error;
  }

  const categoryPoints = new Map(
    (await fetchServiceCategories()).map((row) => [row.category, row.points])
  );

  const columns: MatrixColumn[] = committeeRows
    .filter((row): row is CommitteeRow & { committees: object } => Boolean(row.committees))
    .map((row) => {
      const committee = row.committees as NonNullable<CommitteeRow["committees"]>;
      const overlay = row.cfp_committee_catalog;
      const meta = COLUMN_META.get(normalizeName(committee.name));

      const kind = ((overlay?.kind || meta?.kind) ?? "committee") as CommitteeKind;
      const category =
        overlay?.service_category === null ||
        overlay?.service_category === undefined ||
        overlay?.service_category === ""
          ? (meta?.category ?? null)
          : Number(overlay.service_category);
      const sortOrder =
        overlay?.display_order === null ||
        overlay?.display_order === undefined ||
        overlay?.display_order === ""
          ? (meta?.order ?? Number.MAX_SAFE_INTEGER)
          : Number(overlay.display_order);

      return {
        id: Number(committee.id ?? row.DT_RowId?.replace(/^row_/, "")),
        name: committee.name,
        type: (kind === "leadership" ? "role" : "committee") as "role" | "committee",
        kind,
        category,
        servicePoints:
          category !== null
            ? (categoryPoints.get(category) ?? meta?.servicePoints ?? null)
            : (meta?.servicePoints ?? null),
        sortOrder,
      };
    })
    .sort(
      (a, b) =>
        (a as { sortOrder: number }).sortOrder - (b as { sortOrder: number }).sortOrder ||
        a.name.localeCompare(b.name)
    )
    .map(({ id, name, type, kind, category, servicePoints }) => ({
      id,
      name,
      type,
      kind,
      category,
      servicePoints,
    }));

  const columnTypeById = new Map(columns.map((column) => [column.id, column.type]));

  const [memberRows, summaryRows] = await Promise.all([
    editorLoad<MemberRow>(ASSIGNMENTS_URL),
    editorLoad<SummaryRow>(`${SUMMARY_URL}?academic_year=${encodeURIComponent(academicYear)}`),
  ]);

  const assignments: LoadedAssignment[] = memberRows
    .map((row) => {
      const member = row.members;
      if (!member) return null;
      const catalogId = Number(member.committee_id);
      return {
        assignmentId: row.DT_RowId ?? `row_${member.id}`,
        userid: member.userid,
        catalogId,
        uiCode: dbRoleToUiCode(member.role, columnTypeById.get(catalogId) ?? "committee"),
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
        comments: summary.comments ?? "",
      };
    })
    .filter((summary): summary is LoadedSummary => summary !== null);

  return { source: "db", columns, assignments, summaries };
}

// ── Column management (the Edit-columns panel) ──────────────────────────────

export interface ColumnDraft {
  name: string;
  kind: CommitteeKind;
  category: number | null;
}

export async function createMatrixColumn(draft: ColumnDraft): Promise<void> {
  await editorSubmit(CATALOG_URL, "create", {
    "0": {
      committees: { name: draft.name },
      cfp_committee_catalog: { kind: draft.kind, service_category: draft.category },
    },
  });
}

export async function updateMatrixColumn(id: number, draft: ColumnDraft): Promise<void> {
  await editorSubmit(CATALOG_URL, "edit", {
    [`row_${id}`]: {
      committees: { name: draft.name },
      cfp_committee_catalog: { kind: draft.kind, service_category: draft.category },
    },
  });
}

/** Removes the column, its metadata, and every assignment stored in it. */
export async function deleteMatrixColumn(id: number): Promise<void> {
  await editorSubmit(CATALOG_URL, "remove", { [`row_${id}`]: {} });
}

// ── Cell + comments save (diff against the loaded baseline) ─────────────────

export interface SaveMatrixInput {
  academicYear: string;
  /** Current cell state keyed `${userid}-${committeeId}` → UI code. */
  memberships: Record<string, string>;
  /** Assignments as loaded (the diff baseline). */
  loadedAssignments: LoadedAssignment[];
  /** Current comments keyed by userid. */
  comments: Record<string, string>;
  loadedSummaries: LoadedSummary[];
}

export interface SaveMatrixResult {
  created: number;
  updated: number;
  removed: number;
  summariesSaved: number;
}

export async function saveMatrix(input: SaveMatrixInput): Promise<SaveMatrixResult> {
  const { academicYear, memberships, loadedAssignments, comments, loadedSummaries } = input;

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
    const committeeId = Number(key.slice(separatorIndex + 1));
    const existing = baseline.get(key);

    if (uiCode && !existing) {
      creates[String(createIndex++)] = {
        [ASSIGN_TABLE]: {
          committee_id: committeeId,
          userid,
          role: uiCodeToDbRole(uiCode as MatrixCellCode),
        },
      };
    } else if (uiCode && existing && existing.uiCode !== uiCode) {
      edits[existing.assignmentId] = {
        [ASSIGN_TABLE]: { role: uiCodeToDbRole(uiCode as MatrixCellCode) },
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

  // Comments: upsert one summary row per userid with a manual comment.
  const summaryBaseline = new Map(loadedSummaries.map((summary) => [summary.userid, summary]));
  const summaryCreates: Record<string, Record<string, unknown>> = {};
  const summaryEdits: Record<string, Record<string, unknown>> = {};
  let summaryIndex = 0;

  for (const [userid, comment] of Object.entries(comments)) {
    const existing = summaryBaseline.get(userid);
    const payload = {
      [SUMMARY_TABLE]: { userid, academic_year: academicYear, comments: comment },
    };
    if (existing) {
      if (existing.comments !== comment) {
        summaryEdits[existing.summaryId] = payload;
      }
    } else if (comment) {
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
