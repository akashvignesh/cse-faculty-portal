export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { withErrorHandler } from "@/lib/api/errors";
import { parseEditorBody } from "@/lib/editor/body";
import { auditFields, createEditor } from "@/lib/editor/factory";

const TABLE = "cfp_area_tag_master";

async function buildEditor(): Promise<Editor> {
  const { editor, session } = await createEditor(TABLE, "tag_id", {
    resource: "course-tags",
  });
  return editor.fields(
    new Field(`${TABLE}.tag_id`).set(false),
    new Field(`${TABLE}.name`).validator(Validate.notEmpty()).validator(Validate.maxLen(64)),
    ...auditFields(TABLE, session)
  );
}

/** GET /api/editor/area-tag-master — the canonical area-tag list */
export const GET = withErrorHandler(async () => {
  const editor = await buildEditor();
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/area-tag-master — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = await buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
