export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { withErrorHandler } from "@/lib/api/errors";
import { parseEditorBody } from "@/lib/editor/body";
import { auditFields, createEditor } from "@/lib/editor/factory";

const TABLE = "cfp_course_area_tag";
const MASTER = "cfp_area_tag_master";

function buildEditor(): Editor {
  return createEditor(TABLE, "course_area_tag_id")
    .fields(
      new Field(`${TABLE}.course_area_tag_id`).set(false),
      new Field(`${TABLE}.crse_id`).validator(Validate.notEmpty()).validator(Validate.maxLen(10)),
      new Field(`${TABLE}.tag_id`).validator(Validate.notEmpty()).validator(Validate.numeric()),
      ...auditFields(TABLE),
      // Read-only joined tag name for display.
      new Field(`${MASTER}.name`).set(false)
    )
    .leftJoin(MASTER, `${MASTER}.tag_id`, "=", `${TABLE}.tag_id`);
}

/** GET /api/editor/course-area-tag?crse_id=... */
export const GET = withErrorHandler(async (request: Request) => {
  const editor = buildEditor();
  const crseId = new URL(request.url).searchParams.get("crse_id");
  if (crseId) {
    editor.where(`${TABLE}.crse_id`, crseId);
  }
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/course-area-tag — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
