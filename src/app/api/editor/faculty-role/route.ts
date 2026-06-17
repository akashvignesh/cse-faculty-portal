export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { ALL_ROLES } from "@/components/course-preference/coursePreferenceUtils";
import { withErrorHandler } from "@/lib/api/errors";
import { parseEditorBody } from "@/lib/editor/body";
import { academicYearValidator, auditFields, createEditor } from "@/lib/editor/factory";

const TABLE = "cfp_faculty_role";

function buildEditor(): Editor {
  return createEditor(TABLE, "role_id").fields(
    // Pkey as read-only field so GET rows are self-describing.
    new Field(`${TABLE}.role_id`).set(false),
    new Field(`${TABLE}.person_number`)
      .validator(Validate.notEmpty())
      .validator(Validate.maxLen(8)),
    new Field(`${TABLE}.academic_year`)
      .validator(Validate.notEmpty())
      .validator(academicYearValidator),
    new Field(`${TABLE}.role`)
      .validator(Validate.notEmpty())
      .validator(Validate.values(ALL_ROLES)),
    ...auditFields(TABLE)
  );
}

function applyFilters(editor: Editor, url: URL): void {
  const personNumber = url.searchParams.get("person_number");
  if (personNumber) {
    editor.where(`${TABLE}.person_number`, personNumber);
  }
  const academicYear = url.searchParams.get("academic_year");
  if (academicYear) {
    editor.where(`${TABLE}.academic_year`, academicYear);
  }
}

/** GET /api/editor/faculty-role?person_number=...&academic_year=2025-2026 */
export const GET = withErrorHandler(async (request: Request) => {
  const editor = buildEditor();
  applyFilters(editor, new URL(request.url));
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/faculty-role — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
