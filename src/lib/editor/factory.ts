import "server-only";
import Editor, { Field } from "datatables.net-editor-server";
import { ApiError } from "@/lib/api/errors";
import { getSession, type Session } from "@/lib/auth";
import { assertWritable, getDb } from "@/lib/db";
import { isDbMode } from "@/lib/env";
import { rbacValidator, type EditorRbacDescriptor } from "./rbac";

/**
 * Creates an Editor instance bound to one of the editable cfp_* tables.
 * Any table outside the allowlist is refused — university tables are
 * read-only by ground rule. Every editor carries the RBAC validator for its
 * resource (writes are permission-checked before they execute) and the
 * session it was built for, so routes can stamp audit columns.
 */
export async function createEditor(
  table: string,
  pkey: string,
  rbac: EditorRbacDescriptor
): Promise<{ editor: Editor; session: Session }> {
  if (!isDbMode) {
    throw new ApiError(
      503,
      "Editable features require FACULTY_DATA_MODE=db (local mock mode has no persistence)."
    );
  }
  assertWritable(table);
  const session = await getSession();
  const editor = new Editor(getDb(), table, pkey);
  editor.validator(rbacValidator(session, table, pkey, rbac));
  return { editor, session };
}

/** "YYYY-MM-DD HH:mm:ss" in server-local time, for the cfp_* `dt` audit column. */
export function nowDateTime(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
}

/**
 * Audit columns shared by every editable cfp_* table: `editor` (userid) and
 * `dt` (app-set timestamp). `ts` is DB-managed and never written.
 */
export function auditFields(table: string, session: Session): Field[] {
  return [
    new Field(`${table}.editor`).set(true).setValue(session.userid),
    new Field(`${table}.dt`).set(true).setValue(nowDateTime()),
  ];
}

type ValidatorResult = true | string;

/**
 * Field validator for the 9-char academic year convention ("2025-2026").
 * Absent/empty values pass — Editor runs validators even for fields that were
 * not submitted (e.g. partial edits); requiredness on create is enforced by
 * the preceding Validate.notEmpty().
 */
export async function academicYearValidator(value: unknown): Promise<ValidatorResult> {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  const text = typeof value === "string" ? value.trim() : "";
  const match = /^(\d{4})-(\d{4})$/.exec(text);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    return 'academic_year must be consecutive years in the form "YYYY-YYYY"';
  }
  return true;
}
