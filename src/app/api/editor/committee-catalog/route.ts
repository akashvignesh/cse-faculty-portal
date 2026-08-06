export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ApiError, withErrorHandler } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { parseEditorBody } from "@/lib/editor/body";
import { nowDateTime } from "@/lib/editor/factory";
import { isDbMode } from "@/lib/env";
import { COMMITTEE_KINDS, type CommitteeKind } from "@/services/committee/committeeSummary";

// The matrix's columns live in committees.committees (the canonical CSE
// committee table). Presentation metadata the legacy table lacks — kind,
// service category, display order — lives in the ubs_emp.cfp_committee_catalog
// overlay, joined via source_committee_id. Both are written with plain knex
// (cross-schema), speaking the Editor wire protocol:
//   GET  → { data: [{ DT_RowId, committees: {…}, cfp_committee_catalog: {…} }] }
//   POST → { action, data: { <rowId>: { committees: {…}, cfp_committee_catalog: {…} } } }
// The Edit-columns UI on the committee-preference page drives POST.
const COMMITTEES = "committees.committees";
const MEMBERS = "committees.members";
const OVERLAY = "ubs_emp.cfp_committee_catalog";

interface CatalogRow {
  id: number;
  ub_ent_abbr: string | null;
  name: string;
  description: string | null;
  cms_display: number | null;
  kind: string | null;
  service_category: number | null;
  display_order: number | null;
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

function catalogQuery() {
  return getDb()
    .select(
      "c.id",
      "c.ub_ent_abbr",
      "c.name",
      "c.description",
      "c.cms_display",
      "k.kind",
      "k.service_category",
      "k.display_order"
    )
    .from(`${COMMITTEES} as c`)
    .leftJoin(`${OVERLAY} as k`, "k.source_committee_id", "c.id");
}

function toWireRow(row: CatalogRow) {
  return {
    DT_RowId: `row_${row.id}`,
    committees: {
      id: row.id,
      ub_ent_abbr: row.ub_ent_abbr,
      name: row.name,
      description: row.description,
      cms_display: row.cms_display,
    },
    cfp_committee_catalog: {
      kind: row.kind,
      service_category: row.service_category,
      display_order: row.display_order,
    },
  };
}

interface ColumnPayload {
  name?: string;
  kind?: CommitteeKind;
  service_category?: number | null;
}

function validateColumn(
  submitted: {
    committees?: Record<string, unknown>;
    cfp_committee_catalog?: Record<string, unknown>;
  },
  requireAll: boolean
): { payload: ColumnPayload; fieldErrors: FieldError[] } {
  const fieldErrors: FieldError[] = [];
  const payload: ColumnPayload = {};
  const committee = submitted.committees ?? {};
  const overlay = submitted.cfp_committee_catalog ?? {};

  if (committee.name !== undefined || requireAll) {
    const name = typeof committee.name === "string" ? committee.name.trim() : "";
    if (!name || name.length > 255) {
      fieldErrors.push({
        name: "committees.name",
        status: "name is required (max 255 characters)",
      });
    } else {
      payload.name = name;
    }
  }

  if (overlay.kind !== undefined || requireAll) {
    const kind = typeof overlay.kind === "string" ? overlay.kind.trim() : "";
    if (!COMMITTEE_KINDS.includes(kind as CommitteeKind)) {
      fieldErrors.push({
        name: "cfp_committee_catalog.kind",
        status: `kind must be one of: ${COMMITTEE_KINDS.join(", ")}`,
      });
    } else {
      payload.kind = kind as CommitteeKind;
    }
  }

  if (overlay.service_category !== undefined) {
    if (overlay.service_category === null || overlay.service_category === "") {
      payload.service_category = null;
    } else {
      const category = Number(overlay.service_category);
      if (!Number.isInteger(category) || category < 1 || category > 6) {
        fieldErrors.push({
          name: "cfp_committee_catalog.service_category",
          status: "service_category must be between 1 and 6",
        });
      } else {
        payload.service_category = category;
      }
    }
  }

  return { payload, fieldErrors };
}

function parseRowId(rowId: string): number | null {
  const id = Number(rowId.replace(/^row_/, ""));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Next display_order: leadership slots in below 100, the rest above. */
async function nextDisplayOrder(kind: CommitteeKind, committeeId: number): Promise<number> {
  if (kind !== "leadership") {
    return 100 + committeeId;
  }
  const row = await getDb()
    .max<{ max_order: number | null }[]>("display_order as max_order")
    .from(OVERLAY)
    .where("kind", "leadership")
    .first();
  return Math.max(Number((row as { max_order?: number | null })?.max_order ?? 0), 0) + 10;
}

/** GET /api/editor/committee-catalog */
export const GET = withErrorHandler(async () => {
  requireDbMode();
  const rows = (await catalogQuery().orderBy("c.id", "asc")) as CatalogRow[];
  return NextResponse.json({ data: rows.map(toWireRow) });
});

/** POST /api/editor/committee-catalog — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  requireDbMode();
  const body = await parseEditorBody(request);
  const action = body.action;
  const data = (body.data ?? {}) as Record<
    string,
    { committees?: Record<string, unknown>; cfp_committee_catalog?: Record<string, unknown> }
  >;
  const db = getDb();
  const audit = { editor: getCurrentUser().userid, dt: nowDateTime() };

  if (action === "create") {
    const clean: Required<Pick<ColumnPayload, "name" | "kind">>[] = [];
    const categories: (number | null)[] = [];
    for (const submitted of Object.values(data)) {
      const { payload, fieldErrors } = validateColumn(submitted, true);
      if (fieldErrors.length > 0) return NextResponse.json({ data: [], fieldErrors });
      clean.push({ name: payload.name as string, kind: payload.kind as CommitteeKind });
      categories.push(payload.service_category ?? null);
    }

    const savedRows: CatalogRow[] = [];
    for (const [index, row] of clean.entries()) {
      const [insertedId] = await db(COMMITTEES).insert({
        ub_ent_abbr: "CSE",
        name: row.name,
        // Leadership "columns" are matrix constructs, not public committees.
        cms_display: row.kind === "leadership" ? 0 : 1,
        ...audit,
      });
      const committeeId = Number(insertedId);
      if (!Number.isInteger(committeeId) || committeeId <= 0) {
        throw new ApiError(500, "Insert did not return a committee id");
      }
      await db(OVERLAY).insert({
        source_committee_id: committeeId,
        name: row.name,
        kind: row.kind,
        service_category: categories[index],
        display_order: await nextDisplayOrder(row.kind, committeeId),
        ...audit,
      });
      const saved = (await catalogQuery().where("c.id", committeeId).first()) as
        | CatalogRow
        | undefined;
      if (saved) savedRows.push(saved);
    }
    return NextResponse.json({ data: savedRows.map(toWireRow) });
  }

  if (action === "edit") {
    const savedRows: CatalogRow[] = [];
    for (const [rowId, submitted] of Object.entries(data)) {
      const id = parseRowId(rowId);
      if (id === null) throw new ApiError(400, `Invalid row id: ${rowId}`);
      const { payload, fieldErrors } = validateColumn(submitted, false);
      if (fieldErrors.length > 0) return NextResponse.json({ data: [], fieldErrors });

      if (payload.name !== undefined) {
        await db(COMMITTEES)
          .where("id", id)
          .update({ name: payload.name, ...audit });
      }
      const overlayFields: Record<string, unknown> = {};
      if (payload.name !== undefined) overlayFields.name = payload.name;
      if (payload.kind !== undefined) overlayFields.kind = payload.kind;
      if (payload.service_category !== undefined) {
        overlayFields.service_category = payload.service_category;
      }
      if (Object.keys(overlayFields).length > 0) {
        const updated = await db(OVERLAY)
          .where("source_committee_id", id)
          .update({ ...overlayFields, ...audit });
        if (updated === 0) {
          // No overlay row yet (legacy committee): create one.
          const current = (await db(COMMITTEES).select("name").where("id", id).first()) as
            | { name: string }
            | undefined;
          if (!current) throw new ApiError(404, `Committee not found: ${id}`);
          const kind = (payload.kind ?? "committee") as CommitteeKind;
          await db(OVERLAY).insert({
            source_committee_id: id,
            name: payload.name ?? current.name,
            kind,
            service_category: payload.service_category ?? null,
            display_order: await nextDisplayOrder(kind, id),
            ...audit,
          });
        }
      }
      const saved = (await catalogQuery().where("c.id", id).first()) as CatalogRow | undefined;
      if (saved) savedRows.push(saved);
    }
    return NextResponse.json({ data: savedRows.map(toWireRow) });
  }

  if (action === "remove") {
    const ids = Object.keys(data).map(parseRowId);
    if (ids.some((id) => id === null)) {
      throw new ApiError(400, "Invalid row id in remove request");
    }
    // Children first: assignments, then the overlay, then the committee row.
    await db(MEMBERS)
      .whereIn("committee_id", ids as number[])
      .delete();
    await db(OVERLAY)
      .whereIn("source_committee_id", ids as number[])
      .delete();
    await db(COMMITTEES)
      .whereIn("id", ids as number[])
      .delete();
    return NextResponse.json({ data: [] });
  }

  throw new ApiError(400, `Unsupported Editor action: ${String(action)}`);
});
