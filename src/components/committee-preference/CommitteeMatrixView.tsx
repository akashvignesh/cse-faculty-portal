"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DetailSidebar from "@/components/faculty-detail/DetailSidebar";
import { APP_TITLE } from "@/config/appConfig";
import { EditorError } from "@/lib/editor/client";
import { displayValue } from "@/lib/format";
import { currentAcademicYear } from "@/lib/term";
import {
  loadMatrixData,
  saveMatrix,
  type LoadedAssignment,
  type LoadedSummary,
  type MatrixColumn,
} from "@/services/committee/committeeMatrixService";
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

interface SummaryCol {
  key: string;
  label: string;
  editable: boolean;
  autoCompute?: boolean;
  type?: "number" | "text";
}

const SUMMARY_COLS: SummaryCol[] = [
  { key: "chairs", label: "# of Chairs", editable: false, autoCompute: true },
  { key: "total", label: "# of Committees", editable: false, autoCompute: false },
  { key: "others", label: "# of Others", editable: true, type: "number" },
  { key: "servicePoints", label: "Service Points", editable: true, type: "number" },
  { key: "comments", label: "Comments", editable: true, type: "text" },
];

// Collapsible aggregate rows shown above the faculty list
const COUNT_ROW_DEFS = [
  { key: "chairs", label: "# of Chairs", static: false },
  { key: "viceChairs", label: "# of Vice Chairs", static: false },
  { key: "members", label: "# of Members", static: false },
  { key: "category", label: "Category", static: true },
  { key: "servicePoints", label: "Service Points", static: true },
];

export default function CommitteeMatrixView({ userid }: { userid: string }) {
  const academicYear = useMemo(() => currentAcademicYear(), []);

  const [records, setRecords] = useState<Faculty[]>([]);
  const [columns, setColumns] = useState<MatrixColumn[]>([]);
  const [dataSource, setDataSource] = useState<"db" | "mock">("mock");
  const [loadedAssignments, setLoadedAssignments] = useState<LoadedAssignment[]>([]);
  const [loadedSummaries, setLoadedSummaries] = useState<LoadedSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [memberships, setMemberships] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Record<string, Record<string, string>>>({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCounts, setShowCounts] = useState(false);

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

    const cells: Record<string, string> = {};
    data.assignments.forEach((assignment) => {
      cells[`${assignment.userid}-${assignment.catalogId}`] = assignment.uiCode;
    });
    setMemberships(cells);

    const extrasByUser: Record<string, Record<string, string>> = {};
    data.summaries.forEach((summary) => {
      extrasByUser[summary.userid] = {
        others: summary.others,
        servicePoints: summary.servicePoints,
        comments: summary.comments,
      };
    });
    setExtras(extrasByUser);
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

    load();
    return () => {
      isActive = false;
    };
  }, [academicYear]);

  const faculty = useMemo(() => findFacultyByUserid(records, userid), [records, userid]);

  useEffect(() => {
    document.title = faculty
      ? `${faculty.name} Edit Committee Preference | ${APP_TITLE}`
      : `Edit Committee Preference | ${APP_TITLE}`;
  }, [faculty]);

  function getValue(uid: string, committeeId: number): string {
    return memberships[`${uid}-${committeeId}`] ?? "";
  }

  function setValue(uid: string, committeeId: number, value: string) {
    setMemberships((cur) => ({ ...cur, [`${uid}-${committeeId}`]: value }));
    setSubmitMessage("");
    setSubmitError("");
  }

  function countChairs(uid: string): number {
    return committeeCols.filter((c) => getValue(uid, c.id) === "C").length;
  }

  function countCommittees(uid: string): number {
    return committeeCols.filter((c) => Boolean(getValue(uid, c.id))).length;
  }

  function getExtra(uid: string, key: string): string {
    return extras[uid]?.[key] ?? "";
  }

  function setExtra(uid: string, key: string, val: string) {
    setExtras((cur) => ({ ...cur, [uid]: { ...cur[uid], [key]: val } }));
    setSubmitMessage("");
    setSubmitError("");
  }

  async function handleSubmit() {
    setSubmitMessage("");
    setSubmitError("");

    if (dataSource === "mock") {
      const total = Object.values(memberships).filter(Boolean).length;
      setSubmitMessage(
        `Saved ${total} assignment${total === 1 ? "" : "s"} (mock mode — not persisted).`
      );
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveMatrix({
        academicYear,
        memberships,
        loadedAssignments,
        extras,
        loadedSummaries,
      });
      // Reload so the baseline reflects what is now stored.
      const refreshed = await loadMatrixData(academicYear);
      applyLoadedData(refreshed);
      setSubmitMessage(
        `Saved: ${result.created} added, ${result.updated} updated, ${result.removed} removed` +
          (result.summariesSaved > 0 ? `, ${result.summariesSaved} summary rows.` : ".")
      );
    } catch (error) {
      if (error instanceof EditorError) {
        setSubmitError(`Save failed — ${error.message}`);
      } else {
        setSubmitError(
          `Save failed. ${error instanceof Error ? error.message : "Unknown error."}`
        );
      }
    } finally {
      setIsSaving(false);
    }
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
      {isLoading ? (
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
                    <span>Edit Committee Preference</span>
                  </nav>
                </section>

                <section className="faculty-secondary-card">
                  <div className="faculty-committee-heading">
                    <h2>Edit Committee Preference</h2>
                    <p>
                      Faculty committee membership assignments for {academicYear}
                      {dataSource === "mock" ? " (mock data)" : ""}.
                    </p>
                  </div>

                  <div className="faculty-secondary-body">
                    <div className="faculty-secondary-section faculty-preference-section-inline">
                      {/* ── Toolbar: legend + counts toggle ── */}
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
                      </div>

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

                                  {/* Role columns — single X button (no checkbox) */}
                                  {roleCols.map((c) => {
                                    const marked = getValue(member.userid, c.id) === "X";
                                    return (
                                      <td key={c.id} className="committee-matrix-td-cell">
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
                                      </td>
                                    );
                                  })}

                                  {/* Committee columns — R/C/V/M dropdown */}
                                  {committeeCols.map((c) => {
                                    const val = getValue(member.userid, c.id);
                                    return (
                                      <td key={c.id} className="committee-matrix-td-cell">
                                        <select
                                          className={`committee-matrix-select${val ? ` committee-matrix-select-${val}` : ""}`}
                                          value={val}
                                          onChange={(e) => setValue(member.userid, c.id, e.target.value)}
                                          aria-label={`${member.name} — ${c.name}`}
                                          title={`${member.name} — ${c.name}`}
                                        >
                                          {COMMITTEE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                    );
                                  })}

                                  {/* Summary cells */}
                                  {SUMMARY_COLS.map((col) => {
                                    if (!col.editable) {
                                      const computed = col.autoCompute
                                        ? countChairs(member.userid)
                                        : countCommittees(member.userid);
                                      return (
                                        <td
                                          key={col.key}
                                          className="committee-matrix-td-summary committee-matrix-td-computed"
                                        >
                                          {computed}
                                        </td>
                                      );
                                    }
                                    return (
                                      <td
                                        key={col.key}
                                        className={`committee-matrix-td-summary${col.type === "text" ? " committee-matrix-td-comments" : ""}`}
                                      >
                                        <input
                                          type={col.type}
                                          className={
                                            col.type === "text"
                                              ? "committee-matrix-input-text"
                                              : "committee-matrix-input-number"
                                          }
                                          value={getExtra(member.userid, col.key)}
                                          onChange={(e) => setExtra(member.userid, col.key, e.target.value)}
                                          aria-label={`${col.label} for ${member.name}`}
                                          min={col.type === "number" ? "0" : undefined}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ── Actions ── */}
                      <div className="faculty-preference-actions">
                        <button
                          type="button"
                          className="faculty-course-preference-submit"
                          onClick={handleSubmit}
                          disabled={isSaving}
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
