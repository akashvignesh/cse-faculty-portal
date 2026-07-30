"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePermission, useSession } from "@/components/auth/AuthProvider";
import { APP_TITLE } from "@/config/appConfig";
import { ROLES, type Role } from "@/lib/permissions";
import {
  createUserRole,
  loadUserRoles,
  removeUserRole,
  updateUserRole,
  type UserRoleRow,
} from "@/services/roles/userRoleService";
import { loadFacultyRecords } from "@/services/faculty/facultyService";

// Chair-only role management (cfp_user_role). Reassigning the chair is:
// add/promote the new chair FIRST, then demote or remove yourself — the
// server rejects any change that would leave zero chairs (409).

export default function UserRolesPage() {
  const { can, isLoading: isAuthLoading } = usePermission();
  const { session } = useSession();
  const canManage = can("user-role:edit");

  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [available, setAvailable] = useState(true);
  const [rosterUserids, setRosterUserids] = useState<{ userid: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: "", type: "" });
  const [newUserid, setNewUserid] = useState("");
  const [newRole, setNewRole] = useState<Role>("staff");

  useEffect(() => {
    document.title = `User Roles | ${APP_TITLE}`;
  }, []);

  async function refresh() {
    const result = await loadUserRoles();
    setAvailable(result.available);
    setRows(result.rows);
  }

  useEffect(() => {
    if (isAuthLoading || !canManage) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [roleResult, roster] = await Promise.all([
          loadUserRoles(),
          loadFacultyRecords().catch(() => []),
        ]);
        if (!active) return;
        setAvailable(roleResult.available);
        setRows(roleResult.rows);
        setRosterUserids(
          roster
            .filter((member) => member.userid)
            .map((member) => ({ userid: member.userid, name: member.name }))
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthLoading, canManage]);

  async function mutate(action: () => Promise<void>, successText: string) {
    setBusy(true);
    setMessage({ text: "", type: "" });
    try {
      await action();
      await refresh();
      setMessage({ text: successText, type: "success" });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Unknown error.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  function handleAdd() {
    const userid = newUserid.trim();
    if (!userid) {
      setMessage({ text: "Enter a userid to assign a role.", type: "error" });
      return;
    }
    void mutate(async () => {
      await createUserRole(userid, newRole);
      setNewUserid("");
    }, `Assigned ${newRole} to ${userid}.`);
  }

  function handleRoleChange(row: UserRoleRow, role: Role) {
    const isSelf = session && row.userid.toLowerCase() === session.userid.toLowerCase();
    if (
      isSelf &&
      row.role === "chair" &&
      role !== "chair" &&
      !window.confirm(
        `Demote yourself from chair to ${role}? You will immediately lose access to this page.`
      )
    ) {
      return;
    }
    void mutate(() => updateUserRole(row.rowId, role), `Changed ${row.userid} to ${role}.`);
  }

  function handleRemove(row: UserRoleRow) {
    if (
      !window.confirm(
        `Remove the ${row.role} assignment for ${row.userid}? They fall back to ` +
          `"faculty" if they are on the CSE roster, otherwise "viewer".`
      )
    ) {
      return;
    }
    void mutate(() => removeUserRole(row.rowId), `Removed the role row for ${row.userid}.`);
  }

  return (
    <>
      <section className="portal-page-intro" aria-label="Page introduction">
        <h1 className="portal-page-title">{APP_TITLE}</h1>
        <nav className="portal-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">CSE Faculty Portal</Link>
          <span aria-hidden="true">&gt;</span>
          <span>User Roles</span>
        </nav>
      </section>

      <div className="faculty-secondary-section">
        <div className="faculty-preference-heading">
          <h2>User Roles</h2>
        </div>

        {isAuthLoading || (canManage && loading) ? (
          <div className="faculty-table-status" role="status">
            Loading role assignments…
          </div>
        ) : !canManage ? (
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            Only the department chair can manage user roles.
          </div>
        ) : (
          <div className="leave-editor">
            {!available && (
              <div className="faculty-table-status" role="status">
                Managing roles requires the database backend (and the cfp_user_role migration).
              </div>
            )}

            <div className="faculty-table-status" role="note">
              Users without a row default to <strong>faculty</strong> when they are on the CSE
              roster and <strong>viewer</strong> otherwise — only chair/staff/viewer overrides
              need a row. To hand over the chair: assign the new chair first, then demote or
              remove yourself (the server refuses to leave the portal without a chair).
            </div>

            <table className="leave-editor-table" aria-label="Role assignments">
              <thead>
                <tr>
                  <th>Userid</th>
                  <th>Role</th>
                  <th>Last changed by</th>
                  <th aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="leave-editor-empty">
                      No explicit role assignments yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isSelf =
                      session && row.userid.toLowerCase() === session.userid.toLowerCase();
                    return (
                      <tr key={row.rowId}>
                        <td>
                          {row.userid}
                          {isSelf ? " (you)" : ""}
                        </td>
                        <td>
                          <select
                            value={row.role}
                            disabled={!available || busy}
                            onChange={(e) => handleRoleChange(row, e.target.value as Role)}
                            aria-label={`Role for ${row.userid}`}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {row.editor ?? "—"}
                          {row.dt ? ` (${row.dt})` : ""}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="leave-editor-delete"
                            disabled={!available || busy}
                            onClick={() => handleRemove(row)}
                            aria-label={`Remove role for ${row.userid}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="leave-editor-actions">
              <input
                type="text"
                list="user-roles-roster"
                value={newUserid}
                maxLength={8}
                placeholder="userid"
                disabled={!available || busy}
                onChange={(e) => setNewUserid(e.target.value)}
                aria-label="Userid to assign"
              />
              <datalist id="user-roles-roster">
                {rosterUserids.map((member) => (
                  <option key={member.userid} value={member.userid}>
                    {member.name}
                  </option>
                ))}
              </datalist>
              <select
                value={newRole}
                disabled={!available || busy}
                onChange={(e) => setNewRole(e.target.value as Role)}
                aria-label="Role to assign"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="cp-save-btn"
                onClick={handleAdd}
                disabled={!available || busy}
              >
                {busy ? "Saving…" : "Assign Role"}
              </button>
              {message.text && (
                <span className={`cp-save-message cp-save-message-${message.type}`} role="status">
                  {message.text}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
