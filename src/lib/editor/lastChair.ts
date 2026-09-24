import "server-only";
import type Editor from "datatables.net-editor-server";
import type { IDtRequest } from "datatables.net-editor-server";
import { ConflictError, ForbiddenError } from "@/lib/api/errors";
import type { Session } from "@/lib/auth";
import { rowIdsFromKeys, submittedRows } from "./locks";

// Lockout protection for cfp_user_role: the portal must always keep at least
// one chair, because only the chair can manage roles. Reassigning the chair
// is therefore: create/promote the new chair FIRST, then demote or remove
// the outgoing one (two chairs may coexist momentarily; zero never).
//
// Emergency escape hatches if a lockout somehow happens anyway: the DEV_ROLE
// env override, or a manual UPDATE on ubs_emp.cfp_user_role.

const TABLE = "cfp_user_role";

const LAST_CHAIR_MESSAGE =
  "The portal must always have at least one chair. Assign the new chair first, " +
  "then demote or remove the outgoing one.";

export async function lastChairValidator(
  editorInst: Editor,
  _action: string,
  http: IDtRequest
): Promise<true | string> {
  const action = http.action;
  if (action !== "edit" && action !== "remove") return true;

  const rows = submittedRows(http);
  const rowIds = rowIdsFromKeys(rows);
  if (rowIds.length === 0) return true;

  const db = editorInst.db();
  const chairRows: { user_role_id: number | string }[] = await db(TABLE)
    .where("role", "chair")
    .select("user_role_id");
  const chairIds = new Set(chairRows.map((row) => String(row.user_role_id)));

  let remainingChairs = chairIds.size;
  for (const id of rowIds) {
    const submittedRole = rows[`row_${id}`]?.[TABLE]?.role;
    if (chairIds.has(String(id))) {
      if (action === "remove") {
        remainingChairs -= 1;
      } else if (submittedRole !== undefined && String(submittedRole) !== "chair") {
        remainingChairs -= 1; // demotion
      }
    } else if (action === "edit" && String(submittedRole) === "chair") {
      remainingChairs += 1; // promotion in the same request
    }
  }

  if (remainingChairs < 1) {
    throw new ConflictError(LAST_CHAIR_MESSAGE);
  }
  return true;
}

// Anti-escalation: staff may manage users, but only a CHAIR can appoint or
// remove chairs. A non-chair cannot set any row's role to 'chair', nor edit or
// remove a row that is currently a chair. This stops a staff member from making
// themselves (or anyone) chair, or unseating the chair.
export function chairAssignmentGuard(session: Session) {
  return async (editorInst: Editor, _action: string, http: IDtRequest): Promise<true | string> => {
    if (session.role === "chair") return true; // chairs may manage chairs (still subject to lastChair)

    const action = http.action;
    if (action !== "create" && action !== "edit" && action !== "remove") return true;

    const rows = submittedRows(http);

    // Block granting the chair role.
    for (const row of Object.values(rows)) {
      const submittedRole = row?.[TABLE]?.role;
      if (submittedRole !== undefined && String(submittedRole) === "chair") {
        throw new ForbiddenError("Only a chair can assign the chair role.");
      }
    }

    // Block editing/removing rows that are currently chairs.
    if (action === "edit" || action === "remove") {
      const rowIds = rowIdsFromKeys(rows);
      if (rowIds.length > 0) {
        const existingChairs = await editorInst
          .db()(TABLE)
          .whereIn("user_role_id", rowIds)
          .where("role", "chair")
          .select("user_role_id");
        if (existingChairs.length > 0) {
          throw new ForbiddenError("Only a chair can modify or remove a chair assignment.");
        }
      }
    }

    return true;
  };
}
