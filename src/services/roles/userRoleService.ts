// Client-side data layer for RBAC role assignments (/api/editor/user-role).
// Chair-only: the endpoint rejects both reads and writes for other roles.

import { editorLoad, editorSubmit, EditorError } from "@/lib/editor/client";
import type { Role } from "@/lib/permissions";

const URL = "/api/editor/user-role";
const TABLE = "cfp_user_role";

export interface UserRoleRow {
  rowId: string;
  userid: string;
  role: Role;
  editor: string | null;
  dt: string | null;
}

interface WireRow {
  DT_RowId?: string;
  cfp_user_role?: {
    user_role_id: number | string;
    userid: string;
    role: string;
    editor?: string | null;
    dt?: string | null;
  };
}

/** Loads all role assignments. available=false signals mock mode or no access. */
export async function loadUserRoles(): Promise<{ available: boolean; rows: UserRoleRow[] }> {
  let wire: WireRow[];
  try {
    wire = await editorLoad<WireRow>(URL);
  } catch (error) {
    if (error instanceof EditorError) {
      return { available: false, rows: [] };
    }
    throw error;
  }
  const rows: UserRoleRow[] = [];
  for (const row of wire) {
    const r = row.cfp_user_role;
    if (!r) continue;
    rows.push({
      rowId: row.DT_RowId ?? `row_${r.user_role_id}`,
      userid: r.userid,
      role: r.role as Role,
      editor: r.editor ?? null,
      dt: r.dt ?? null,
    });
  }
  rows.sort((a, b) => a.userid.localeCompare(b.userid));
  return { available: true, rows };
}

export async function createUserRole(userid: string, role: Role): Promise<void> {
  await editorSubmit(URL, "create", { "0": { [TABLE]: { userid, role } } });
}

export async function updateUserRole(rowId: string, role: Role): Promise<void> {
  await editorSubmit(URL, "edit", { [rowId]: { [TABLE]: { role } } });
}

export async function removeUserRole(rowId: string): Promise<void> {
  await editorSubmit(URL, "remove", { [rowId]: {} });
}
