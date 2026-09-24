"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePermission } from "@/components/auth/AuthProvider";
import DetailSidebar from "@/components/faculty-detail/DetailSidebar";
import { APP_TITLE } from "@/config/appConfig";
import { EditorError } from "@/lib/editor/client";
import { displayValue } from "@/lib/format";
import { currentAcademicYear } from "@/lib/term";
import {
  createMatrixColumn,
  deleteMatrixColumn,
  fetchServiceCategories,
  loadMatrixData,
  saveMatrix,
  updateMatrixColumn,
  type ColumnDraft,
  type LoadedAssignment,
  type LoadedSummary,
  type MatrixColumn,
  type ServiceCategory,
} from "@/services/committee/committeeMatrixService";
import {
  computeServicePoints,
  countChairs,
  countCommittees,
  countOthers,
  formatServicePoints,
  type CommitteeKind,
} from "@/services/committee/committeeSummary";
import { findFacultyByUserid, loadFacultyRecords } from "@/services/faculty/facultyService";
import type { Faculty } from "@/types/faculty";

const COMMITTEE_OPTIONS = [
  { value: "", label: "—" },
  { value: "R", label: "R" },
  { value: "C", label: "C" },
  { value: "V", label: "V" },
  { value: "M", label: "M" },
];

// Legend — no "X" entry; role columns are self-explanatory via the "Roles" group header
const LEGEND_ITEMS = [
  { value: "R", label: "Role in committee", badgeClass: "committee-matrix-legend-badge-r" },
  { value: "C", label: "Chair", badgeClass: "committee-matrix-legend-badge-c" },
  { value: "V", label: "Vice Chair", badgeClass: "committee-matrix-legend-badge-v" },
  { value: "M", label: "Member", badgeClass: "committee-matrix-legend-badge-m" },
];

// Summary columns — all computed live with the service workbook's formulas
// except Comments, which is manual and persisted per faculty.
const SUMMARY_COLS = [
  { key: "chairs", label: "# of Chairs", editable: false },
  { key: "total", label: "# of Committees", editable: false },
  { key: "others", label: "# of Others", editable: false },
  { key: "servicePoints", label: "Service Points", editable: false },
  { key: "comments", label: "Comments", editable: true },
] as const;

// Collapsible aggregate rows shown above the faculty list
const COUNT_ROW_DEFS = [
  { key: "chairs", label: "# of Chairs", static: false },
  { key: "viceChairs", label: "# of Vice Chairs", static: false },
  { key: "members", label: "# of Members", static: false },
  { key: "category", label: "Category", static: true },
  { key: "servicePoints", label: "Service Points", static: true },
];

const KIND_OPTIONS: { value: CommitteeKind; label: string }[] = [
  { value: "leadership", label: "Role (leadership)" },
  { value: "committee", label: "Committee" },
  { value: "taskforce", label: "Task force" },
  { value: "seas", label: "SEAS" },
  { value: "pool", label: "Pool" },
];

const EMPTY_DRAFT: ColumnDraft = { name: "", kind: "committee", category: 2 };

function draftsFromColumns(columns: MatrixColumn[]): Record<number, ColumnDraft> {
  const drafts: Record<number, ColumnDraft> = {};
  for (const column of columns) {
    drafts[column.id] = { name: column.name, kind: column.kind, category: column.category };
  }
  return drafts;
}

export default function CommitteeMatrixView({ userid }: { userid: string }) {
  const academicYear = useMemo(() => currentAcademicYear(), []);
  const { can, isLoading: isAuthLoading } = usePermission();
  // Committee management is chair-only — without committee:view the page never
  // loads data and renders an access notice (the data endpoints 403 too).
  const canViewCommittee = can("committee:view");

  const [records, setRecords] = useState<Faculty[]>([]);
  const [columns, setColumns] = useState<MatrixColumn[]>([]);
  const [dataSource, setDataSource] = useState<"db" | "mock">("mock");
  const [loadedAssignments, setLoadedAssignments] = useState<LoadedAssignment[]>([]);
  const [loadedSummaries, setLoadedSummaries] = useState<LoadedSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [memberships, setMemberships] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCounts, setShowCounts] = useState(false);
  const [showReportsMenu, setShowReportsMenu] = useState(false);

  // ── Edit-columns panel state ──
  const [editMode, setEditMode] = useState(false);
  const [columnDrafts, setColumnDrafts] = useState<Record<number, ColumnDraft>>({});
  const [newColumn, setNewColumn] = useState<ColumnDraft>(EMPTY_DRAFT);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [editBusy, setEditBusy] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editError, setEditError] = useState("");

  const roleCols = useMemo(() => columns.filter((c) => c.type === "role"), [columns]);
  const committeeCols = useMemo(() => columns.filter((c) => c.type === "committee"), [columns]);

  function applyLoadedData(data: {
    source: "db" | "mock";
    columns: MatrixColumn[];
    assignments: LoadedAssignment[];
    summaries: LoadedSummary[];
  }) {
    setDataSource(data.source);
    setColumns(data.columns);
    setLoadedAssignments(data.assignments);
    setLoadedSummaries(data.summaries);
    setColumnDrafts(draftsFromColumns(data.columns));

    const cells: Record<string, string> = {};
    data.assignments.forEach((assignment) => {
      cells[`${assignment.userid}-${assignment.catalogId}`] = assignment.uiCode;
    });
    setMemberships(cells);

    const commentsByUser: Record<string, string> = {};
    data.summaries.forEach((summary) => {
      commentsByUser[summary.userid] = summary.comments;
    });
    setComments(commentsByUser);
    setHasUnsavedChanges(false);
  }

  useEffect(() => {
    let isActive = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [nextRecords, matrixData] = await Promise.all([
          loadFacultyRecords(),
          loadMatrixData(academicYear),
        ]);
        if (!isActive) return;
        setRecords(nextRecords);
        applyLoadedData(matrixData);
      } catch (error) {
        if (!isActive) return;
        setRecords([]);
        setErrorMessage(
          `Unable to load committee data. ${error instanceof Error ? error.message : "Unknown error."}`
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    if (!isAuthLoading && canViewCommittee) {
      load();
    }
    return () => {
      isActive = false;
    };
  }, [academicYear, isAuthLoading, canViewCommittee]);

  const faculty = useMemo(() => findFacultyByUserid(records, userid), [records, userid]);

  useEffect(() => {
    document.title = faculty
      ? `${faculty.name} Roles and Committees | ${APP_TITLE}`
      : `Roles and Committees | ${APP_TITLE}`;
  }, [faculty]);

  function getValue(uid: string, committeeId: number): string {
    return memberships[`${uid}-${committeeId}`] ?? "";
  }

  function setValue(uid: string, committeeId: number, value: string) {
    setMemberships((cur) => ({ ...cur, [`${uid}-${committeeId}`]: value }));
    setHasUnsavedChanges(true);
    setSubmitMessage("");
    setSubmitError("");
  }

  function getComment(uid: string): string {
    return comments[uid] ?? "";
  }

  function setComment(uid: string, value: string) {
    setComments((cur) => ({ ...cur, [uid]: value }));
    setHasUnsavedChanges(true);
    setSubmitMessage("");
    setSubmitError("");
  }

  /** Restores cells/comments to the last-loaded (saved) state. */
  function resetUnsavedChanges() {
    const cells: Record<string, string> = {};
    loadedAssignments.forEach((assignment) => {
      cells[`${assignment.userid}-${assignment.catalogId}`] = assignment.uiCode;
    });
    setMemberships(cells);

    const commentsByUser: Record<string, string> = {};
    loadedSummaries.forEach((summary) => {
      commentsByUser[summary.userid] = summary.comments;
    });
    setComments(commentsByUser);
    setHasUnsavedChanges(false);
  }

  // Computed summary values (workbook formulas — see committeeSummary.ts).
  function computedSummary(uid: string, key: string): string {
    const getCell = (committeeId: number) => getValue(uid, committeeId);
    switch (key) {
      case "chairs":
        return String(countChairs(columns, getCell));
      case "total":
        return String(countCommittees(columns, getCell));
      case "others":
        return String(countOthers(columns, getCell));
      case "servicePoints":
        return formatServicePoints(computeServicePoints(columns, getCell));
      default:
        return "";
    }
  }

  async function reloadMatrix() {
    const refreshed = await loadMatrixData(academicYear);
    applyLoadedData(refreshed);
  }

  async function handleSubmit() {
    setSubmitMessage("");
    setSubmitError("");

    if (dataSource === "mock") {
      const total = Object.values(memberships).filter(Boolean).length;
      setSubmitMessage(
        `Saved ${total} assignment${total === 1 ? "" : "s"} (mock mode — not persisted).`
      );
      setHasUnsavedChanges(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveMatrix({
        academicYear,
        memberships,
        loadedAssignments,
        comments,
        loadedSummaries,
      });
      // Reload so the baseline reflects what is now stored.
      await reloadMatrix();
      setSubmitMessage(
        `Saved: ${result.created} added, ${result.updated} updated, ${result.removed} removed` +
          (result.summariesSaved > 0 ? `, ${result.summariesSaved} comment rows.` : ".")
      );
    } catch (error) {
      if (error instanceof EditorError) {
        setSubmitError(`Save failed — ${error.message}`);
      } else {
        setSubmitError(`Save failed. ${error instanceof Error ? error.message : "Unknown error."}`);
      }
    } finally {
      setIsSaving(false);
    }
  }

  // ── Edit-mode handlers ──

  async function toggleEditMode() {
    const next = !editMode;
    if (!next && hasUnsavedChanges) {
      const discard = window.confirm(
        "You have unsaved changes. Leave edit mode and discard them?\n\nClick Cancel to stay and use Save Changes to keep them."
      );
      if (!discard) return;
      resetUnsavedChanges();
    }
    setEditMode(next);
    setEditMessage("");
    setEditError("");
    setSubmitMessage("");
    setSubmitError("");
    if (next && categories.length === 0 && dataSource === "db") {
      setCategories(await fetchServiceCategories());
    }
  }

  function setDraft(id: number, patch: Partial<ColumnDraft>) {
    setColumnDrafts((cur) => {
      const existing = cur[id];
      if (!existing) return cur;
      return { ...cur, [id]: { ...existing, ...patch } };
    });
  }

  function isDraftDirty(column: MatrixColumn): boolean {
    const draft = columnDrafts[column.id];
    if (!draft) return false;
    return (
      draft.name !== column.name ||
      draft.kind !== column.kind ||
      (draft.category ?? null) !== (column.category ?? null)
    );
  }

  async function runEditOp(op: () => Promise<void>, successMessage: string) {
    setEditBusy(true);
    setEditMessage("");
    setEditError("");
    try {
      await op();
      await reloadMatrix();
      setEditMessage(successMessage);
    } catch (error) {
      setEditError(
        error instanceof EditorError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown error."
      );
    } finally {
      setEditBusy(false);
    }
  }

  async function handleAddColumn() {
    const name = newColumn.name.trim();
    if (!name) {
      setEditError("Enter a name for the new committee or role.");
      return;
    }
    await runEditOp(() => createMatrixColumn({ ...newColumn, name }), `Added "${name}".`);
    setNewColumn(EMPTY_DRAFT);
  }

  async function handleSaveColumn(column: MatrixColumn) {
    const draft = columnDrafts[column.id];
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setEditError("Column name cannot be empty.");
      return;
    }
    await runEditOp(() => updateMatrixColumn(column.id, { ...draft, name }), `Updated "${name}".`);
  }

  async function handleDeleteColumn(column: MatrixColumn) {
    const confirmed = window.confirm(
      `Delete "${column.name}"?\n\nThis removes the column AND every assignment stored in it. This cannot be undone.`
    );
    if (!confirmed) return;
    await runEditOp(() => deleteMatrixColumn(column.id), `Deleted "${column.name}".`);
  }

  function categoryOptions() {
    if (categories.length > 0) return categories;
    return [1, 2, 3, 4, 5, 6].map((category) => ({
      category,
      label: `Category ${category}`,
      points: 0,
    }));
  }

  // Per-column aggregate counts for the collapsible count rows
  function colCount(committeeId: number, value: string): number {
    return records.filter((m) => getValue(m.userid, committeeId) === value).length;
  }

  function getCountRowVal(col: MatrixColumn, rowKey: string): string | number {
    if (col.type === "role") {
      if (rowKey === "members") {
        const n = colCount(col.id, "X");
        return n > 0 ? n : "";
      }
      if (rowKey === "category") return col.category ?? "";
      if (rowKey === "servicePoints") return col.servicePoints ?? "";
      return "";
    }
    if (rowKey === "chairs") {
      const n = colCount(col.id, "C");
      return n > 0 ? n : "";
    }
    if (rowKey === "viceChairs") {
      const n = colCount(col.id, "V");
      return n > 0 ? n : "";
    }
    if (rowKey === "members") {
      const n = colCount(col.id, "M");
      return n > 0 ? n : "";
    }
    if (rowKey === "category") return col.category ?? "";
    if (rowKey === "servicePoints") return col.servicePoints ?? "";
    return "";
  }

  return (
    <section className="faculty-detail-panel">
      {!isAuthLoading && !canViewCommittee ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            Committee management is handled by the department chair. Your role does not have access
            to this page — committee memberships are shown on each faculty profile under the
            Committee tab.
          </div>
        </div>
      ) : isLoading ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status" role="status">
            Loading committee preferences…
          </div>
        </div>
      ) : errorMessage ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            {errorMessage}
          </div>
        </div>
      ) : !faculty ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            No faculty detail was found for userid {displayValue(userid)}.
          </div>
        </div>
      ) : (
        <div className="faculty-detail-body">
          <div className="faculty-detail-workspace">
            <DetailSidebar userid={faculty.userid} activePage="committee-preference" />

            <div className="faculty-detail-content">
              <div className="faculty-profile-layout">
                <section
                  className="portal-page-intro portal-page-intro-compact"
                  aria-label="Page introduction"
                >
                  <h1 className="portal-page-title">{APP_TITLE}</h1>
                  <nav className="portal-breadcrumb" aria-label="Breadcrumb">
                    <Link href="/">CSE Faculty Portal</Link>
                    <span>&gt;</span>
                    <Link href={`/faculty/${faculty.userid}`}>Faculty</Link>
                    <span>&gt;</span>
                    <span>Roles and Committees</span>
                  </nav>
                </section>

                <section className="faculty-secondary-card">
                  <div className="faculty-committee-heading">
                    <h2>Roles and Committees</h2>
                    <p>
                      Faculty committee membership assignments for {academicYear}
                      {dataSource === "mock" ? " (mock data)" : ""}.
                    </p>
                  </div>

                  <div className="faculty-secondary-body">
                    <div className="faculty-secondary-section faculty-preference-section-inline">
                      {/* ── Toolbar: legend + counts toggle + edit + reports ── */}
                      <div className="committee-matrix-toolbar">
                        <div className="committee-matrix-legend" aria-label="Role legend">
                          {LEGEND_ITEMS.map((item) => (
                            <span key={item.value} className="committee-matrix-legend-item">
                              <span className={`committee-matrix-legend-badge ${item.badgeClass}`}>
                                {item.value}
                              </span>
                              {item.label}
                            </span>
                          ))}
                        </div>

                        <div className="committee-matrix-toolbar-actions">
                          <button
                            type="button"
                            className="committee-counts-toggle"
                            onClick={() => setShowCounts((c) => !c)}
                            aria-expanded={showCounts}
                          >
                            <span className="committee-counts-toggle-icon" aria-hidden="true">
                              {showCounts ? "▼" : "▶"}
                            </span>
                            {showCounts ? "Hide Column Counts" : "Show Column Counts"}
                          </button>

                          <button
                            type="button"
                            className={`committee-reports-toggle${editMode ? " committee-edit-toggle-on" : ""}`}
                            onClick={toggleEditMode}
                            aria-expanded={editMode}
                          >
                            {editMode ? "Done Editing" : "Edit"}
                          </button>

                          <div className="committee-reports-dropdown">
                            <button
                              type="button"
                              className="committee-reports-toggle"
                              onClick={() => setShowReportsMenu((v) => !v)}
                              aria-expanded={showReportsMenu}
                              aria-haspopup="menu"
                            >
                              Reports ▾
                            </button>
                            {showReportsMenu ? (
                              <div className="committee-reports-menu" role="menu">
                                <Link
                                  href={`/faculty/${faculty.userid}/committee-preference/reports/by-name`}
                                  className="committee-reports-menu-item"
                                  role="menuitem"
                                  onClick={() => setShowReportsMenu(false)}
                                >
                                  By Name
                                </Link>
                                <Link
                                  href={`/faculty/${faculty.userid}/committee-preference/reports/by-committee`}
                                  className="committee-reports-menu-item"
                                  role="menuitem"
                                  onClick={() => setShowReportsMenu(false)}
                                >
                                  By Committee
                                </Link>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* ── Edit-columns panel ── */}
                      {editMode ? (
                        <div
                          className="committee-edit-panel"
                          aria-label="Edit committees and roles"
                        >
                          {dataSource === "mock" ? (
                            <div className="committee-edit-note" role="note">
                              Editing committees and roles requires database mode — changes here are
                              disabled while the portal runs on mock data.
                            </div>
                          ) : (
                            <>
                              <div className="committee-edit-add-row">
                                <input
                                  type="text"
                                  className="committee-edit-name-input"
                                  placeholder="New committee or role name…"
                                  value={newColumn.name}
                                  onChange={(e) =>
                                    setNewColumn((cur) => ({ ...cur, name: e.target.value }))
                                  }
                                  aria-label="New column name"
                                  disabled={editBusy}
                                />
                                <select
                                  className="committee-edit-select"
                                  value={newColumn.kind}
                                  onChange={(e) =>
                                    setNewColumn((cur) => ({
                                      ...cur,
                                      kind: e.target.value as CommitteeKind,
                                    }))
                                  }
                                  aria-label="New column type"
                                  disabled={editBusy}
                                >
                                  {KIND_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  className="committee-edit-select"
                                  value={newColumn.category ?? ""}
                                  onChange={(e) =>
                                    setNewColumn((cur) => ({
                                      ...cur,
                                      category:
                                        e.target.value === "" ? null : Number(e.target.value),
                                    }))
                                  }
                                  aria-label="New column service category"
                                  disabled={editBusy}
                                >
                                  <option value="">No category</option>
                                  {categoryOptions().map((option) => (
                                    <option key={option.category} value={option.category}>
                                      {option.category} — {option.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="committee-edit-add-btn"
                                  onClick={handleAddColumn}
                                  disabled={editBusy}
                                >
                                  + Add
                                </button>
                              </div>

                              <div className="committee-edit-list">
                                {columns.map((column) => {
                                  const draft = columnDrafts[column.id];
                                  if (!draft) return null;
                                  const dirty = isDraftDirty(column);
                                  return (
                                    <div key={column.id} className="committee-edit-row">
                                      <input
                                        type="text"
                                        className="committee-edit-name-input"
                                        value={draft.name}
                                        onChange={(e) =>
                                          setDraft(column.id, { name: e.target.value })
                                        }
                                        aria-label={`Name for ${column.name}`}
                                        disabled={editBusy}
                                      />
                                      <select
                                        className="committee-edit-select"
                                        value={draft.kind}
                                        onChange={(e) =>
                                          setDraft(column.id, {
                                            kind: e.target.value as CommitteeKind,
                                          })
                                        }
                                        aria-label={`Type for ${column.name}`}
                                        disabled={editBusy}
                                      >
                                        {KIND_OPTIONS.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                      <select
                                        className="committee-edit-select"
                                        value={draft.category ?? ""}
                                        onChange={(e) =>
                                          setDraft(column.id, {
                                            category:
                                              e.target.value === "" ? null : Number(e.target.value),
                                          })
                                        }
                                        aria-label={`Service category for ${column.name}`}
                                        disabled={editBusy}
                                      >
                                        <option value="">No category</option>
                                        {categoryOptions().map((option) => (
                                          <option key={option.category} value={option.category}>
                                            {option.category} — {option.label}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        className="committee-edit-save-btn"
                                        onClick={() => handleSaveColumn(column)}
                                        disabled={editBusy || !dirty}
                                        title={dirty ? "Save changes to this column" : "No changes"}
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        className="committee-edit-delete-btn"
                                        onClick={() => handleDeleteColumn(column)}
                                        disabled={editBusy}
                                        title="Delete this column and all its assignments"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              {editMessage ? (
                                <div className="faculty-course-preference-feedback" role="status">
                                  {editMessage}
                                </div>
                              ) : null}
                              {editError ? (
                                <div
                                  className="faculty-table-status faculty-table-status-error"
                                  role="alert"
                                >
                                  {editError}
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      ) : null}

                      {/* ── Matrix table ── */}
                      <div className="committee-matrix-wrapper">
                        <table className="committee-matrix-table" role="grid">
                          <thead>
                            {/* ── Row 1: group labels ── */}
                            <tr className="committee-matrix-group-row">
                              <th rowSpan={2} className="committee-matrix-th-name" scope="col">
                                Faculty Name
                              </th>

                              <th
                                colSpan={roleCols.length}
                                className="committee-matrix-th-group-roles"
                              >
                                Roles
                              </th>

                              <th
                                colSpan={committeeCols.length + SUMMARY_COLS.length}
                                className="committee-matrix-th-group-empty"
                              />
                            </tr>

                            {/* ── Row 2: individual rotated column headers ── */}
                            <tr>
                              {roleCols.map((c) => (
                                <th
                                  key={c.id}
                                  className="committee-matrix-th-rotated committee-matrix-th-role-col committee-matrix-th-row2"
                                  scope="col"
                                  title={c.name}
                                >
                                  <div className="committee-matrix-th-label">{c.name}</div>
                                </th>
                              ))}

                              {committeeCols.map((c) => (
                                <th
                                  key={c.id}
                                  className="committee-matrix-th-rotated committee-matrix-th-row2"
                                  scope="col"
                                  title={c.name}
                                >
                                  <div className="committee-matrix-th-label">{c.name}</div>
                                </th>
                              ))}

                              {SUMMARY_COLS.map((col) => (
                                <th
                                  key={col.key}
                                  className="committee-matrix-th-rotated committee-matrix-th-summary committee-matrix-th-row2"
                                  scope="col"
                                  title={col.label}
                                >
                                  <div className="committee-matrix-th-label">{col.label}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>
                            {/* ── Collapsible count rows (hidden by default) ── */}
                            {showCounts &&
                              COUNT_ROW_DEFS.map((srow) => (
                                <tr
                                  key={srow.key}
                                  className={`committee-matrix-tr-count${srow.static ? " committee-matrix-tr-count-static" : ""}`}
                                >
                                  <td className="committee-matrix-td-name committee-matrix-td-count-label">
                                    {srow.label}
                                  </td>
                                  {roleCols.map((c) => (
                                    <td key={c.id} className="committee-matrix-td-count-val">
                                      {getCountRowVal(c, srow.key)}
                                    </td>
                                  ))}
                                  {committeeCols.map((c) => (
                                    <td key={c.id} className="committee-matrix-td-count-val">
                                      {getCountRowVal(c, srow.key)}
                                    </td>
                                  ))}
                                  {SUMMARY_COLS.map((col) => (
                                    <td key={col.key} className="committee-matrix-td-count-empty" />
                                  ))}
                                </tr>
                              ))}

                            {/* ── Faculty rows ── */}
                            {records.map((member, rowIndex) => {
                              const isEven = rowIndex % 2 === 1;
                              return (
                                <tr key={member.userid}>
                                  {/* Sticky name cell */}
                                  <td
                                    className={`committee-matrix-td-name${isEven ? " committee-matrix-td-name-even" : ""}`}
                                  >
                                    {member.name}
                                  </td>

                                  {/* Role columns — X badge (read-only) / toggle (edit mode) */}
                                  {roleCols.map((c) => {
                                    const marked = getValue(member.userid, c.id) === "X";
                                    return (
                                      <td key={c.id} className="committee-matrix-td-cell">
                                        {editMode ? (
                                          <button
                                            type="button"
                                            className={
                                              marked
                                                ? "committee-matrix-role-btn committee-matrix-role-btn-on"
                                                : "committee-matrix-role-btn committee-matrix-role-btn-off"
                                            }
                                            onClick={() =>
                                              setValue(member.userid, c.id, marked ? "" : "X")
                                            }
                                            aria-label={`${member.name} — ${c.name}${marked ? " (assigned)" : ""}`}
                                            aria-pressed={marked}
                                            title={`${member.name} — ${c.name}`}
                                          >
                                            {marked ? "X" : ""}
                                          </button>
                                        ) : marked ? (
                                          <span
                                            className="committee-matrix-legend-badge committee-matrix-static-x"
                                            title={`${member.name} — ${c.name} (assigned)`}
                                          >
                                            X
                                          </span>
                                        ) : null}
                                      </td>
                                    );
                                  })}

                                  {/* Committee columns — badge (read-only) / R/C/V/M dropdown (edit mode) */}
                                  {committeeCols.map((c) => {
                                    const val = getValue(member.userid, c.id);
                                    return (
                                      <td key={c.id} className="committee-matrix-td-cell">
                                        {editMode ? (
                                          <select
                                            className={`committee-matrix-select${val ? ` committee-matrix-select-${val}` : ""}`}
                                            value={val}
                                            onChange={(e) =>
                                              setValue(member.userid, c.id, e.target.value)
                                            }
                                            aria-label={`${member.name} — ${c.name}`}
                                            title={`${member.name} — ${c.name}`}
                                          >
                                            {COMMITTEE_OPTIONS.map((opt) => (
                                              <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        ) : val ? (
                                          <span
                                            className={`committee-matrix-legend-badge committee-matrix-legend-badge-${val.toLowerCase()}`}
                                            title={`${member.name} — ${c.name}`}
                                          >
                                            {val}
                                          </span>
                                        ) : null}
                                      </td>
                                    );
                                  })}

                                  {/* Summary cells — computed except Comments */}
                                  {SUMMARY_COLS.map((col) => {
                                    if (!col.editable) {
                                      return (
                                        <td
                                          key={col.key}
                                          className="committee-matrix-td-summary committee-matrix-td-computed"
                                          title={`${col.label} for ${member.name} (computed)`}
                                        >
                                          {computedSummary(member.userid, col.key)}
                                        </td>
                                      );
                                    }
                                    return (
                                      <td
                                        key={col.key}
                                        className="committee-matrix-td-summary committee-matrix-td-comments"
                                      >
                                        {editMode ? (
                                          <input
                                            type="text"
                                            className="committee-matrix-input-text"
                                            value={getComment(member.userid)}
                                            onChange={(e) =>
                                              setComment(member.userid, e.target.value)
                                            }
                                            aria-label={`${col.label} for ${member.name}`}
                                          />
                                        ) : (
                                          <span
                                            className="committee-matrix-static-comment"
                                            title={getComment(member.userid)}
                                          >
                                            {getComment(member.userid)}
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ── Actions (edit mode only) ── */}
                      {editMode ? (
                        <div className="faculty-preference-actions">
                          <button
                            type="button"
                            className="faculty-course-preference-submit"
                            onClick={handleSubmit}
                            disabled={isSaving || !hasUnsavedChanges}
                            title={
                              hasUnsavedChanges ? "Save assignment changes" : "No unsaved changes"
                            }
                          >
                            {isSaving ? "Saving…" : "Save Changes"}
                          </button>
                          {submitMessage ? (
                            <div className="faculty-course-preference-feedback" role="status">
                              {submitMessage}
                            </div>
                          ) : null}
                          {submitError ? (
                            <div
                              className="faculty-table-status faculty-table-status-error"
                              role="alert"
                            >
                              {submitError}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
