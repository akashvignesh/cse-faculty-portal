import "server-only";
import type Editor from "datatables.net-editor-server";
import type { IDtRequest } from "datatables.net-editor-server";

// Global validators enforcing cfp_faculty_course_plan.locked: a locked plan
// header rejects all slot writes, and edits to the header itself are only
// allowed when they unlock it.

type SubmittedRows = Record<string, Record<string, Record<string, unknown>>>;

const LOCKED_MESSAGE = "This course plan is locked and cannot be modified.";

function submittedRows(http: IDtRequest): SubmittedRows {
  return (http.data ?? {}) as unknown as SubmittedRows;
}

function rowIdsFromKeys(rows: SubmittedRows, idPrefix = "row_"): string[] {
  return Object.keys(rows)
    .filter((key) => key.startsWith(idPrefix))
    .map((key) => key.slice(idPrefix.length));
}

export async function coursePlanLockValidator(
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
  const lockedRows: { course_plan_id: number }[] = await db("cfp_faculty_course_plan")
    .whereIn("course_plan_id", rowIds)
    .where("locked", 1)
    .select("course_plan_id");

  if (lockedRows.length === 0) return true;

  if (action === "edit") {
    const everyLockedRowUnlocks = lockedRows.every((row) => {
      const submitted = rows[`row_${row.course_plan_id}`]?.cfp_faculty_course_plan?.locked;
      return submitted !== undefined && Number(submitted) === 0;
    });
    if (everyLockedRowUnlocks) return true;
  }

  return LOCKED_MESSAGE;
}

export async function semesterPlanLockValidator(
  editorInst: Editor,
  _action: string,
  http: IDtRequest
): Promise<true | string> {
  const action = http.action;
  if (action !== "create" && action !== "edit" && action !== "remove") return true;

  const rows = submittedRows(http);
  const db = editorInst.db();
  const planIds = new Set<number>();

  for (const row of Object.values(rows)) {
    const submitted = row?.cfp_faculty_semester_plan?.course_plan_id;
    if (submitted !== undefined && submitted !== null && submitted !== "") {
      planIds.add(Number(submitted));
    }
  }

  const slotIds = rowIdsFromKeys(rows);
  if (slotIds.length > 0) {
    const slotRows: { course_plan_id: number }[] = await db("cfp_faculty_semester_plan")
      .whereIn("semester_plan_id", slotIds)
      .select("course_plan_id");
    for (const row of slotRows) {
      planIds.add(Number(row.course_plan_id));
    }
  }

  if (planIds.size === 0) return true;

  const locked: { course_plan_id: number }[] = await db("cfp_faculty_course_plan")
    .whereIn("course_plan_id", [...planIds])
    .where("locked", 1)
    .select("course_plan_id");

  return locked.length > 0 ? LOCKED_MESSAGE : true;
}
