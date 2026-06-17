export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { withErrorHandler } from "@/lib/api/errors";
import { parseEditorBody } from "@/lib/editor/body";
import { auditFields, createEditor } from "@/lib/editor/factory";
import { LEAVE_TYPES } from "@/lib/leaveTypes";

const TABLE = "cfp_faculty_leave";

function buildEditor(): Editor {
  return createEditor(TABLE, "leave_id").fields(
    // Pkey as read-only field so GET rows are self-describing.
    new Field(`${TABLE}.leave_id`).set(false),
    new Field(`${TABLE}.person_number`)
      .validator(Validate.notEmpty())
      .validator(Validate.maxLen(8)),
    new Field(`${TABLE}.leave_type`)
      .validator(Validate.notEmpty())
      .validator(Validate.values([...LEAVE_TYPES])),
    new Field(`${TABLE}.start_date`).validator(Validate.notEmpty()),
    new Field(`${TABLE}.end_date`),
    new Field(`${TABLE}.location`),
    new Field(`${TABLE}.reason`),
    new Field(`${TABLE}.backup_person_number`).validator(Validate.maxLen(8)),
    ...auditFields(TABLE)
  );
}

/** GET /api/editor/faculty-leave?person_number=... */
export const GET = withErrorHandler(async (request: Request) => {
  const editor = buildEditor();
  const personNumber = new URL(request.url).searchParams.get("person_number");
  if (personNumber) {
    editor.where(`${TABLE}.person_number`, personNumber);
  }
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/faculty-leave — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
