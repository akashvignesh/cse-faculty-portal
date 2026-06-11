export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { withErrorHandler } from "@/lib/api/errors";
import { parseEditorBody } from "@/lib/editor/body";
import { auditFields, createEditor } from "@/lib/editor/factory";

const TABLE = "cfp_committee_catalog";
const KINDS = ["leadership", "committee", "taskforce", "seas", "pool"];

function buildEditor(): Editor {
  return createEditor(TABLE, "catalog_id").fields(
    // Pkey as read-only field so GET rows are self-describing.
    new Field(`${TABLE}.catalog_id`).set(false),
    new Field(`${TABLE}.source_committee_id`).validator(Validate.numeric()),
    new Field(`${TABLE}.name`).validator(Validate.notEmpty()).validator(Validate.maxLen(255)),
    new Field(`${TABLE}.kind`).validator(Validate.values(KINDS)),
    new Field(`${TABLE}.service_category`)
      .validator(Validate.numeric())
      .validator(Validate.minNum(1))
      .validator(Validate.maxNum(6)),
    new Field(`${TABLE}.display_order`).validator(Validate.numeric()),
    ...auditFields(TABLE)
  );
}

/** GET /api/editor/committee-catalog */
export const GET = withErrorHandler(async () => {
  const editor = buildEditor();
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/committee-catalog — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
