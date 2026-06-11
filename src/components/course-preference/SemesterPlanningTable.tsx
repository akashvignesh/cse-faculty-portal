"use client";

import type { SemesterSlot, SlotStatus } from "@/types/faculty";
import {
  genId,
  NOT_TEACHING_COMMENT_OPTIONS,
  SEMESTER_STATUS_OPTIONS,
  TEACHING_COMMENT_OPTIONS,
} from "./coursePreferenceUtils";

export interface SemesterPlanningTableProps {
  semester: string;
  rows: SemesterSlot[];
  isLocked: boolean;
  canAdd: boolean;
  onChange: (rows: SemesterSlot[]) => void;
}

/**
 * Semester planning table.
 * Rows are pre-populated from the requested semester load.
 */
export default function SemesterPlanningTable({
  semester,
  rows,
  isLocked,
  canAdd,
  onChange,
}: SemesterPlanningTableProps) {
  function addRow() {
    if (!canAdd) return;
    onChange([...rows, { id: genId(semester.toLowerCase()), status: "Teaching", comment: "" }]);
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  function updateRow(id: string, field: "status" | "comment", value: string) {
    onChange(
      rows.map((r) => {
        if (r.id !== id) return r;
        const updated: SemesterSlot =
          field === "status" ? { ...r, status: value as SlotStatus, comment: "" } : { ...r, comment: value };
        return updated;
      })
    );
  }

  function commentOptions(status: SlotStatus): string[] {
    return status === "Teaching" ? TEACHING_COMMENT_OPTIONS : NOT_TEACHING_COMMENT_OPTIONS;
  }

  return (
    <div className="cp-semester-block">
      <div className="cp-semester-block-header">
        <h4 className="cp-semester-block-title">
          <span
            className={`cp-semester-dot cp-semester-dot-${semester.toLowerCase()}`}
            aria-hidden="true"
          />
          {semester}
          {rows.length > 0 && (
            <span className="cp-semester-slot-count">
              {rows.length} slot{rows.length !== 1 ? "s" : ""}
            </span>
          )}
        </h4>
        {canAdd && (
          <button
            type="button"
            className="cp-add-slot-btn"
            onClick={addRow}
            aria-label={`Add ${semester} teaching slot`}
          >
            + Add Slot
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="cp-semester-empty">
          {isLocked ? "No teaching slots recorded." : "No slots requested for this semester."}
        </p>
      ) : (
        <div className="cp-planning-table-wrapper">
          <table className="cp-planning-table" aria-label={`${semester} semester planning`}>
            <thead>
              <tr>
                <th className="cp-col-slot">Course</th>
                <th className="cp-col-status">Status</th>
                <th className="cp-col-comment">Comments / Reason</th>
                {!isLocked && canAdd && <th className="cp-col-action" aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const opts = commentOptions(row.status);
                return (
                  <tr key={row.id}>
                    <td className="cp-col-slot">
                      <span className="cp-slot-number">Course {index + 1}</span>
                    </td>

                    <td className="cp-col-status">
                      {isLocked ? (
                        <span
                          className={`cp-status-badge cp-status-${
                            row.status === "Teaching" ? "teaching" : "not-teaching"
                          }`}
                        >
                          {row.status}
                        </span>
                      ) : (
                        <select
                          className="cp-select cp-status-select"
                          value={row.status}
                          onChange={(e) => updateRow(row.id, "status", e.target.value)}
                          aria-label={`Course ${index + 1} status`}
                        >
                          {SEMESTER_STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td className="cp-col-comment">
                      {isLocked ? (
                        <span className="cp-comment-text">{row.comment || "-"}</span>
                      ) : (
                        <select
                          className="cp-select cp-comment-select"
                          value={row.comment}
                          onChange={(e) => updateRow(row.id, "comment", e.target.value)}
                          aria-label={`Course ${index + 1} comment`}
                        >
                          <option value="">- Select -</option>
                          {opts.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    {!isLocked && canAdd && (
                      <td className="cp-col-action">
                        <button
                          type="button"
                          className="cp-remove-btn"
                          onClick={() => removeRow(row.id)}
                          aria-label={`Remove Course ${index + 1}`}
                          title="Remove slot"
                        >
                          x
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
