import "server-only";
import type Editor from "datatables.net-editor-server";
import type { IDtRequest } from "datatables.net-editor-server";
import { ForbiddenError } from "@/lib/api/errors";
import type { Session } from "@/lib/auth";
import { canEdit, type Resource } from "@/lib/permissions";
import { rowIdsFromKeys, submittedRows, type SubmittedRows } from "./locks";

// Server-side RBAC enforcement for the Editor protocol. Attached as a global
// validator by createEditor(); runs before any write executes. Unlike the
// lock validators this THROWS (a returned string would surface as HTTP 200
// with an {error} body — a denial must be a real 403).

/**
 * How rows of an editor table are tied to the signed-in person, for roles
 * whose edit tier is "own":
 * - "person_number" / "userid": the table has that owner column.
 * - "via-course-plan": semester-plan slots — owner is the person_number of
 *   the parent cfp_faculty_course_plan header.
 * Omit for resources with no own-edit tier (e.g. faculty-leave, course-tags).
 */
export type EditorOwnership = "person_number" | "userid" | "via-course-plan";

export interface EditorRbacDescriptor {
  resource: Resource;
  ownership?: EditorOwnership;
}

const WRITE_ACTIONS = new Set(["create", "edit", "remove"]);

function deny(message: string): never {
  throw new ForbiddenError(message);
}

function ownerValueForSession(session: Session, ownership: EditorOwnership): string {
  if (ownership === "userid") return session.userid;
  if (session.personNumber === null) {
    deny("Your account is not linked to a person number, so you cannot edit these records.");
  }
  return session.personNumber;
}

/** The owner column as submitted in a row payload, or undefined when absent. */
function submittedOwner(
  row: Record<string, Record<string, unknown>> | undefined,
  table: string,
  column: string
): string | undefined {
  const value = row?.[table]?.[column];
  if (value === undefined || value === null || value === "") return undefined;
  return String(value).trim();
}

async function assertOwnColumnRows(
  editorInst: Editor,
  http: IDtRequest,
  table: string,
  pkey: string,
  column: string,
  owner: string
): Promise<void> {
  const rows = submittedRows(http);
  const action = http.action;

  // Any submitted owner value must be the session's own (covers create and
  // blocks reassigning a row to someone else on edit).
  for (const row of Object.values(rows)) {
    const submitted = submittedOwner(row, table, column);
    if (submitted !== undefined && submitted !== owner) {
      deny(`You may only modify your own records (${column} must be ${owner}).`);
    }
  }

  if (action === "create") {
    // Creates must state the owner explicitly — a missing owner field would
    // otherwise insert an unowned row past the check above.
    for (const row of Object.values(rows)) {
      if (submittedOwner(row, table, column) === undefined) {
        deny(`You may only create records for yourself (${column} is required).`);
      }
    }
    return;
  }

  // edit/remove: every targeted existing row must already belong to the owner.
  const rowIds = rowIdsFromKeys(rows);
  if (rowIds.length === 0) return;
  const db = editorInst.db();
  const existing: Record<string, unknown>[] = await db(table)
    .whereIn(pkey, rowIds)
    .select(pkey, column);
  if (existing.length !== rowIds.length) {
    deny("One or more of the targeted rows could not be verified as yours.");
  }
  for (const row of existing) {
    if (String(row[column] ?? "").trim() !== owner) {
      deny("You may only modify your own records.");
    }
  }
}

/** Mirrors semesterPlanLockValidator's plan-id gathering for ownership. */
async function assertViaCoursePlanRows(
  editorInst: Editor,
  http: IDtRequest,
  slotTable: string,
  slotPkey: string,
  owner: string
): Promise<void> {
  const rows: SubmittedRows = submittedRows(http);
  const db = editorInst.db();
  const planIds = new Set<number>();

  for (const row of Object.values(rows)) {
    const submitted = row?.[slotTable]?.course_plan_id;
    if (submitted !== undefined && submitted !== null && submitted !== "") {
      planIds.add(Number(submitted));
    } else if (http.action === "create") {
      deny("You may only create semester slots on your own course plan.");
    }
  }

  const slotIds = rowIdsFromKeys(rows);
  if (slotIds.length > 0) {
    const slotRows: { course_plan_id: number }[] = await db(slotTable)
      .whereIn(slotPkey, slotIds)
      .select("course_plan_id");
    if (slotRows.length !== slotIds.length) {
      deny("One or more of the targeted rows could not be verified as yours.");
    }
    for (const row of slotRows) {
      planIds.add(Number(row.course_plan_id));
    }
  }

  if (planIds.size === 0) return;

  const plans: { course_plan_id: number; person_number: string }[] = await db(
    "cfp_faculty_course_plan"
  )
    .whereIn("course_plan_id", [...planIds])
    .select("course_plan_id", "person_number");
  if (plans.length !== planIds.size) {
    deny("One or more of the targeted course plans could not be verified as yours.");
  }
  for (const plan of plans) {
    if (String(plan.person_number ?? "").trim() !== owner) {
      deny("You may only modify semester slots on your own course plan.");
    }
  }
}

/**
 * Builds the global validator enforcing the permission matrix for one editor
 * table. Reads pass through; writes require the role's edit tier — "all"
 * passes, "none" 403s, and "own" verifies every submitted/targeted row
 * belongs to the signed-in person.
 */
export function rbacValidator(
  session: Session,
  table: string,
  pkey: string,
  descriptor: EditorRbacDescriptor
) {
  return async (editorInst: Editor, _action: string, http: IDtRequest): Promise<true | string> => {
    const action = http.action;
    if (!action || !WRITE_ACTIONS.has(action)) return true;

    const tier = canEdit(session.role, descriptor.resource);
    if (tier === "all") return true;
    if (tier === "none" || !descriptor.ownership) {
      deny(`Your role (${session.role}) cannot modify ${descriptor.resource} records.`);
    }

    const owner = ownerValueForSession(session, descriptor.ownership);
    if (descriptor.ownership === "via-course-plan") {
      await assertViaCoursePlanRows(editorInst, http, table, pkey, owner);
    } else {
      await assertOwnColumnRows(editorInst, http, table, pkey, descriptor.ownership, owner);
    }
    return true;
  };
}
