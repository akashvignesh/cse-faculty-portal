export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { withErrorHandler } from "@/lib/api/errors";
import { parseEditorBody } from "@/lib/editor/body";
import { academicYearValidator, auditFields, createEditor } from "@/lib/editor/factory";

const TABLE = "cfp_committee_assignment";
const CATALOG = "cfp_committee_catalog";

/** P=Position holder, C=Chair, V=Vice-Chair, X=Member, A=Alternate. */
const ROLE_CODES = ["P", "C", "V", "X", "A"];

function buildEditor(): Editor {
  return createEditor(TABLE, "assignment_id")
    .fields(
      new Field(`${TABLE}.catalog_id`).validator(Validate.notEmpty()).validator(Validate.numeric()),
      new Field(`${TABLE}.userid`).validator(Validate.notEmpty()).validator(Validate.maxLen(8)),
      new Field(`${TABLE}.role_code`)
        .validator(Validate.notEmpty())
        .validator(Validate.values(ROLE_CODES)),
      new Field(`${TABLE}.academic_year`)
        .validator(Validate.notEmpty())
        .validator(academicYearValidator),
      ...auditFields(TABLE),
      // Read-only joined catalog columns for display.
      new Field(`${CATALOG}.name`).set(false),
      new Field(`${CATALOG}.kind`).set(false),
      new Field(`${CATALOG}.service_category`).set(false)
    )
    .leftJoin(CATALOG, `${CATALOG}.catalog_id`, "=", `${TABLE}.catalog_id`);
}

function applyFilters(editor: Editor, url: URL): void {
  const academicYear = url.searchParams.get("academic_year");
  if (academicYear) {
    editor.where(`${TABLE}.academic_year`, academicYear);
  }
  const userid = url.searchParams.get("userid");
  if (userid) {
    editor.where(`${TABLE}.userid`, userid);
  }
}

/** GET /api/editor/committee-assignments?academic_year=2025-2026&userid= */
export const GET = withErrorHandler(async (request: Request) => {
  const editor = buildEditor();
  applyFilters(editor, new URL(request.url));
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/committee-assignments — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
