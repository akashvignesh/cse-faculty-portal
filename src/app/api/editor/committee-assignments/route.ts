export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ApiError, withErrorHandler } from "@/lib/api/errors";
import { requirePermission } from "@/lib/api/guard";
import { getSession } from "@/lib/auth";
import { ALLOWED_MEMBER_ROLES } from "@/lib/committeeRoles";
import { getDb } from "@/lib/db";
import { parseEditorBody } from "@/lib/editor/body";
import { nowDateTime } from "@/lib/editor/factory";
import { isDbMode } from "@/lib/env";

// Committee assignments persist in committees.members — the canonical CSE
// membership table (unique on committee_id + userid, audit editor/dt columns).
// It lives outside the ubs_emp default schema, so like the teaching prefs it
// is written with plain knex statements rather than the Editor library, while
// still speaking the same wire protocol the browser-side helpers expect:
//   GET  → { data: [{ DT_RowId, members: {…}, committees: { name } }] }
//   POST → { action: create|edit|remove, data: { <rowId>: { members: {…} } } }
const MEMBERS = "committees.members";
const COMMITTEES = "committees.committees";

interface MemberRow {
  id: number;
  committee_id: number;
  userid: string;
  role: string | null;
  committee_name: string | null;
}

interface FieldError {
  name: string;
  status: string;
}

function requireDbMode(): void {
  if (!isDbMode) {
    throw new ApiError(
      503,
      "Editable features require FACULTY_DATA_MODE=db (local mock mode has no persistence)."
    );
  }
}

function memberQuery() {
  return getDb()
    .select("m.id", "m.committee_id", "m.userid", "m.role", "c.name as committee_name")
    .from(`${MEMBERS} as m`)
    .leftJoin(`${COMMITTEES} as c`, "c.id", "m.committee_id");
}

function toWireRow(row: MemberRow) {
  return {
    DT_RowId: `row_${row.id}`,
    members: {
      id: row.id,
      committee_id: row.committee_id,
      userid: row.userid,
      role: row.role,
    },
    committees: { name: row.committee_name },
  };
}

function fieldErrorResponse(fieldErrors: FieldError[]): NextResponse {
  return NextResponse.json({ data: [], fieldErrors });
}

interface CreatePayload {
  committee_id: number;
  userid: string;
  role: string;
}

/** Validates one submitted row; returns the clean payload or field errors. */
function validateSubmittedRow(
  raw: Record<string, unknown> | undefined,
  requireAll: boolean
): { payload: Partial<CreatePayload>; fieldErrors: FieldError[] } {
  const fieldErrors: FieldError[] = [];
  const payload: Partial<CreatePayload> = {};
  const row = raw ?? {};

  if (row.committee_id !== undefined || requireAll) {
    const committeeId = Number(row.committee_id);
    if (!Number.isInteger(committeeId) || committeeId <= 0) {
      fieldErrors.push({
        name: "members.committee_id",
        status: "committee_id must be a positive integer",
      });
    } else {
      payload.committee_id = committeeId;
    }
  }

  if (row.userid !== undefined || requireAll) {
    const userid = typeof row.userid === "string" ? row.userid.trim() : "";
    if (!userid || userid.length > 8) {
      fieldErrors.push({ name: "members.userid", status: "userid is required (max 8 characters)" });
    } else {
      payload.userid = userid;
    }
  }

  if (row.role !== undefined || requireAll) {
    const role = typeof row.role === "string" ? row.role.trim() : "";
    if (!ALLOWED_MEMBER_ROLES.includes(role)) {
      fieldErrors.push({
        name: "members.role",
        status: `role must be one of: ${ALLOWED_MEMBER_ROLES.join(", ")}`,
      });
    } else {
      payload.role = role;
    }
  }

  return { payload, fieldErrors };
}

function parseRowId(rowId: string): number | null {
  const id = Number(rowId.replace(/^row_/, ""));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** GET /api/editor/committee-assignments?userid= */
export const GET = withErrorHandler(async (request: Request) => {
  requireDbMode();
  await requirePermission("committee:view"); // committee management is chair-only
  const url = new URL(request.url);
  const query = memberQuery();
  const userid = url.searchParams.get("userid");
  if (userid) {
    void query.where("m.userid", userid);
  }
  const rows = (await query.orderBy("m.id", "asc")) as MemberRow[];
  return NextResponse.json({ data: rows.map(toWireRow) });
});

/** POST /api/editor/committee-assignments — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  requireDbMode();
  await requirePermission("committee-assignment:edit"); // chair-only
  const body = await parseEditorBody(request);
  const action = body.action;
  const data = (body.data ?? {}) as Record<string, { members?: Record<string, unknown> }>;
  const db = getDb();
  const audit = { editor: (await getSession()).userid, dt: nowDateTime() };

  if (action === "create") {
    const clean: CreatePayload[] = [];
    for (const submitted of Object.values(data)) {
      const { payload, fieldErrors } = validateSubmittedRow(submitted.members, true);
      if (fieldErrors.length > 0) return fieldErrorResponse(fieldErrors);
      clean.push(payload as CreatePayload);
    }

    const savedRows: MemberRow[] = [];
    for (const row of clean) {
      // Upsert on the (committee_id, userid) unique key so a concurrent or
      // pre-existing membership row is updated rather than erroring.
      await db(MEMBERS)
        .insert({ ...row, ...audit })
        .onConflict(["committee_id", "userid"])
        .merge({ role: row.role, ...audit });
      const saved = (await memberQuery()
        .where("m.committee_id", row.committee_id)
        .where("m.userid", row.userid)
        .first()) as MemberRow | undefined;
      if (saved) savedRows.push(saved);
    }
    return NextResponse.json({ data: savedRows.map(toWireRow) });
  }

  if (action === "edit") {
    const updates: { id: number; payload: Partial<CreatePayload> }[] = [];
    for (const [rowId, submitted] of Object.entries(data)) {
      const id = parseRowId(rowId);
      if (id === null) {
        throw new ApiError(400, `Invalid row id: ${rowId}`);
      }
      const { payload, fieldErrors } = validateSubmittedRow(submitted.members, false);
      if (fieldErrors.length > 0) return fieldErrorResponse(fieldErrors);
      updates.push({ id, payload });
    }

    const savedRows: MemberRow[] = [];
    for (const { id, payload } of updates) {
      await db(MEMBERS)
        .where("id", id)
        .update({ ...payload, ...audit });
      const saved = (await memberQuery().where("m.id", id).first()) as MemberRow | undefined;
      if (saved) savedRows.push(saved);
    }
    return NextResponse.json({ data: savedRows.map(toWireRow) });
  }

  if (action === "remove") {
    const ids = Object.keys(data).map(parseRowId);
    if (ids.some((id) => id === null)) {
      throw new ApiError(400, "Invalid row id in remove request");
    }
    await db(MEMBERS)
      .whereIn("id", ids as number[])
      .delete();
    return NextResponse.json({ data: [] });
  }

  throw new ApiError(400, `Unsupported Editor action: ${String(action)}`);
});
