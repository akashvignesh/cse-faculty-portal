// Client-side data layer for editing faculty leave records via the Editor
// protocol (/api/editor/faculty-leave → ubs_emp.cfp_faculty_leave).

import { editorLoad, editorSubmit, EditorError } from "@/lib/editor/client";

const LEAVE_URL = "/api/editor/faculty-leave";
const LEAVE_TABLE = "cfp_faculty_leave";

export interface LeaveDraft {
  /** Present for stored rows; absent for unsaved new rows. */
  leaveId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  location: string;
  reason: string;
  backupFacultyPersonNumber: string;
}

interface LeaveRow {
  DT_RowId?: string;
  cfp_faculty_leave?: {
    leave_id: number | string;
    person_number: string;
    leave_type: string;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    reason: string | null;
    backup_person_number: string | null;
  };
}

export interface LeaveMutations {
  creates: LeaveDraft[];
  edits: LeaveDraft[];
  removes: string[];
}

function sameFields(a: LeaveDraft, b: LeaveDraft): boolean {
  return (
    a.leaveType === b.leaveType &&
    a.startDate === b.startDate &&
    a.endDate === b.endDate &&
    a.location === b.location &&
    a.reason === b.reason &&
    a.backupFacultyPersonNumber === b.backupFacultyPersonNumber
  );
}

/** Diffs the edited rows against the loaded baseline into create/edit/remove sets. */
export function computeLeaveMutations(
  current: LeaveDraft[],
  baseline: LeaveDraft[]
): LeaveMutations {
  const baselineById = new Map(
    baseline.filter((r) => r.leaveId).map((r) => [r.leaveId as string, r])
  );
  const creates: LeaveDraft[] = [];
  const edits: LeaveDraft[] = [];
  const currentIds = new Set<string>();

  for (const row of current) {
    if (!row.leaveId) {
      creates.push(row);
      continue;
    }
    currentIds.add(row.leaveId);
    const base = baselineById.get(row.leaveId);
    if (!base || !sameFields(row, base)) {
      edits.push(row);
    }
  }

  const removes = [...baselineById.keys()].filter((id) => !currentIds.has(id));
  return { creates, edits, removes };
}

/** Loads stored leave rows. available=false signals mock mode / no editor backend. */
export async function loadLeaves(
  personNumber: string
): Promise<{ available: boolean; leaves: LeaveDraft[] }> {
  let rows: LeaveRow[];
  try {
    rows = await editorLoad<LeaveRow>(
      `${LEAVE_URL}?person_number=${encodeURIComponent(personNumber)}`
    );
  } catch (error) {
    if (error instanceof EditorError) {
      return { available: false, leaves: [] };
    }
    throw error;
  }

  const leaves: LeaveDraft[] = [];
  for (const row of rows) {
    const l = row.cfp_faculty_leave;
    if (!l) continue;
    leaves.push({
      leaveId: String(l.leave_id),
      leaveType: l.leave_type ?? "",
      startDate: l.start_date ?? "",
      endDate: l.end_date ?? "",
      location: l.location ?? "",
      reason: l.reason ?? "",
      backupFacultyPersonNumber: l.backup_person_number ?? "",
    });
  }
  return { available: true, leaves };
}

function toFields(personNumber: string, row: LeaveDraft): Record<string, unknown> {
  return {
    person_number: personNumber,
    leave_type: row.leaveType,
    start_date: row.startDate || null,
    end_date: row.endDate || null,
    location: row.location || null,
    reason: row.reason || null,
    backup_person_number: row.backupFacultyPersonNumber || null,
  };
}

export interface SaveLeavesResult {
  created: number;
  edited: number;
  removed: number;
}

/** Applies the create/edit/remove diff against the stored leave rows. */
export async function saveLeaves(
  personNumber: string,
  current: LeaveDraft[],
  baseline: LeaveDraft[]
): Promise<SaveLeavesResult> {
  const { creates, edits, removes } = computeLeaveMutations(current, baseline);

  if (removes.length > 0) {
    await editorSubmit(LEAVE_URL, "remove", Object.fromEntries(removes.map((id) => [`row_${id}`, {}])));
  }
  if (edits.length > 0) {
    const payload = Object.fromEntries(
      edits.map((row) => [`row_${row.leaveId}`, { [LEAVE_TABLE]: toFields(personNumber, row) }])
    );
    await editorSubmit(LEAVE_URL, "edit", payload);
  }
  if (creates.length > 0) {
    const payload: Record<string, Record<string, unknown>> = {};
    creates.forEach((row, index) => {
      payload[String(index)] = { [LEAVE_TABLE]: toFields(personNumber, row) };
    });
    await editorSubmit(LEAVE_URL, "create", payload);
  }

  return { created: creates.length, edited: edits.length, removed: removes.length };
}
