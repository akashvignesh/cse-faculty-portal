"use client";

import { useEffect, useState } from "react";
import { LEAVE_TYPES } from "@/lib/leaveTypes";
import { loadLeaves, saveLeaves, type LeaveDraft } from "@/services/faculty/leaveService";
import type { Faculty } from "@/types/faculty";

function blankRow(): LeaveDraft {
  return {
    leaveType: LEAVE_TYPES[0],
    startDate: "",
    endDate: "",
    location: "",
    reason: "",
    backupFacultyPersonNumber: "",
  };
}

/**
 * Editable faculty leave grid. In db mode it loads/saves through the Editor
 * route; in mock mode it shows the read-only faculty.leaves data with a note.
 */
export default function LeaveEditor({ faculty }: { faculty: Faculty }) {
  const [rows, setRows] = useState<LeaveDraft[]>([]);
  const [baseline, setBaseline] = useState<LeaveDraft[]>([]);
  const [editorAvailable, setEditorAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: "", type: "" });

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        if (faculty.personNumber) {
          const { available, leaves } = await loadLeaves(faculty.personNumber);
          if (!active) return;
          if (available) {
            setEditorAvailable(true);
            setRows(leaves);
            setBaseline(leaves);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through to the read-only view.
      }
      if (!active) return;
      const fromRead: LeaveDraft[] = faculty.leaves.map((l) => ({
        leaveId: l.leaveId,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        location: l.location,
        reason: l.reason,
        backupFacultyPersonNumber: l.backupFacultyPersonNumber,
      }));
      setEditorAvailable(false);
      setRows(fromRead);
      setBaseline(fromRead);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [faculty.personNumber, faculty.leaves]);

  function updateRow(index: number, patch: Partial<LeaveDraft>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setMessage({ text: "", type: "" });
  }

  function addRow() {
    setRows((prev) => [...prev, blankRow()]);
    setMessage({ text: "", type: "" });
  }

  function deleteRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setMessage({ text: "", type: "" });
  }

  async function handleSave() {
    if (!faculty.personNumber || !editorAvailable) {
      setMessage({
        text: "Editing requires the database backend (mock mode is read-only).",
        type: "error",
      });
      return;
    }
    setSaving(true);
    try {
      const result = await saveLeaves(faculty.personNumber, rows, baseline);
      const refreshed = await loadLeaves(faculty.personNumber);
      if (refreshed.available) {
        setRows(refreshed.leaves);
        setBaseline(refreshed.leaves);
      }
      setMessage({
        text: `Saved (${result.created} added, ${result.edited} updated, ${result.removed} removed).`,
        type: "success",
      });
    } catch (error) {
      setMessage({
        text: `Save failed — ${error instanceof Error ? error.message : "Unknown error."}`,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="faculty-table-status" role="status">
        Loading leave records…
      </div>
    );
  }

  return (
    <div className="leave-editor">
      {!editorAvailable && (
        <div className="faculty-table-status" role="status">
          Showing read-only leave data — editing requires the database backend.
        </div>
      )}

      <table className="leave-editor-table" aria-label={`${faculty.name} leave records`}>
        <thead>
          <tr>
            <th>Leave Type</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Location</th>
            <th>Reason</th>
            <th>Backup Faculty (person #)</th>
            {editorAvailable && <th aria-label="Row actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={editorAvailable ? 7 : 6} className="leave-editor-empty">
                No leave records.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.leaveId ?? `new-${index}`}>
                <td>
                  <select
                    value={row.leaveType}
                    disabled={!editorAvailable}
                    onChange={(e) => updateRow(index, { leaveType: e.target.value })}
                    aria-label="Leave type"
                  >
                    {/* Keep a legacy/free-text value visible if it is not in the vocab. */}
                    {!LEAVE_TYPES.includes(row.leaveType as (typeof LEAVE_TYPES)[number]) &&
                      row.leaveType && <option value={row.leaveType}>{row.leaveType}</option>}
                    {LEAVE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="date"
                    value={row.startDate}
                    disabled={!editorAvailable}
                    onChange={(e) => updateRow(index, { startDate: e.target.value })}
                    aria-label="Start date"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={row.endDate}
                    disabled={!editorAvailable}
                    onChange={(e) => updateRow(index, { endDate: e.target.value })}
                    aria-label="End date"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.location}
                    disabled={!editorAvailable}
                    onChange={(e) => updateRow(index, { location: e.target.value })}
                    aria-label="Location"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.reason}
                    disabled={!editorAvailable}
                    onChange={(e) => updateRow(index, { reason: e.target.value })}
                    aria-label="Reason"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.backupFacultyPersonNumber}
                    disabled={!editorAvailable}
                    maxLength={8}
                    onChange={(e) =>
                      updateRow(index, { backupFacultyPersonNumber: e.target.value })
                    }
                    aria-label="Backup faculty person number"
                  />
                </td>
                {editorAvailable && (
                  <td>
                    <button
                      type="button"
                      className="leave-editor-delete"
                      onClick={() => deleteRow(index)}
                      aria-label="Delete leave row"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {editorAvailable && (
        <div className="leave-editor-actions">
          <button type="button" className="cp-save-btn" onClick={addRow} disabled={saving}>
            Add Leave
          </button>
          <button type="button" className="cp-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Leave"}
          </button>
          {message.text && (
            <span className={`cp-save-message cp-save-message-${message.type}`} role="status">
              {message.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
