export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { withErrorHandler } from "@/lib/api/errors";
import { parseEditorBody } from "@/lib/editor/body";
import { academicYearValidator, auditFields, createEditor } from "@/lib/editor/factory";

// Manual-only cells of the committee summary (# others, points override,
// comments). The computed columns (chairs, totals, points) are derived live
// from cfp_committee_assignment and never stored.
const TABLE = "cfp_committee_service_summary";

function buildEditor(): Editor {
  return createEditor(TABLE, "service_summary_id").fields(
    new Field(`${TABLE}.userid`).validator(Validate.notEmpty()).validator(Validate.maxLen(8)),
    new Field(`${TABLE}.academic_year`)
      .validator(Validate.notEmpty())
      .validator(academicYearValidator),
    new Field(`${TABLE}.others_count`).validator(Validate.numeric()),
    new Field(`${TABLE}.service_points_override`).validator(Validate.numeric()),
    new Field(`${TABLE}.comments`).validator(Validate.maxLen(1024)),
    ...auditFields(TABLE)
  );
}

/** GET /api/editor/service-summary?academic_year=2025-2026&userid= */
export const GET = withErrorHandler(async (request: Request) => {
  const editor = buildEditor();
  const url = new URL(request.url);
  const academicYear = url.searchParams.get("academic_year");
  if (academicYear) {
    editor.where(`${TABLE}.academic_year`, academicYear);
  }
  const userid = url.searchParams.get("userid");
  if (userid) {
    editor.where(`${TABLE}.userid`, userid);
  }
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/service-summary — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
