import "server-only";
import Editor, { Field } from "datatables.net-editor-server";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth";
import { getDb, WRITABLE_TABLES } from "@/lib/db";
import { isDbMode } from "@/lib/env";

/**
 * Creates an Editor instance bound to one of the editable cfp_* tables.
 * Any table outside the allowlist is refused — university tables are
 * read-only by ground rule.
 */
export function createEditor(table: string, pkey: string): Editor {
  if (!isDbMode) {
    throw new ApiError(
      503,
      "Editable features require FACULTY_DATA_MODE=db (local mock mode has no persistence)."
    );
  }
  if (!WRITABLE_TABLES.has(table)) {
    throw new ApiError(500, `Table is not editable: ${table}`);
  }
  return new Editor(getDb(), table, pkey);
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
export function auditFields(table: string): Field[] {
  const user = getCurrentUser();
  return [
    new Field(`${table}.editor`).set(true).setValue(user.userid),
    new Field(`${table}.dt`).set(true).setValue(nowDateTime()),
  ];
}

type ValidatorResult = true | string;

/** Field validator for the 9-char academic year convention ("2025-2026"). */
export async function academicYearValidator(value: unknown): Promise<ValidatorResult> {
  const text = typeof value === "string" ? value.trim() : "";
  const match = /^(\d{4})-(\d{4})$/.exec(text);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    return 'academic_year must be consecutive years in the form "YYYY-YYYY"';
  }
  return true;
}
