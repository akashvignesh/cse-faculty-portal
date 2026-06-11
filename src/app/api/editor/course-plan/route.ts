export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { withErrorHandler } from "@/lib/api/errors";
import { parseEditorBody } from "@/lib/editor/body";
import { academicYearValidator, auditFields, createEditor } from "@/lib/editor/factory";
import { coursePlanLockValidator } from "@/lib/editor/locks";

// Course planner header — one row per faculty per academic year
// (UNIQUE uq_plan_person_year). Slot rows live in /api/editor/semester-plan.
const TABLE = "cfp_faculty_course_plan";

const FACULTY_TYPES = ["Prof Track", "Lecture 10", "Lecture 12"];

function buildEditor(): Editor {
  return createEditor(TABLE, "course_plan_id")
    .fields(
      new Field(`${TABLE}.person_number`)
        .validator(Validate.notEmpty())
        .validator(Validate.maxLen(8)),
      new Field(`${TABLE}.academic_year`)
        .validator(Validate.notEmpty())
        .validator(academicYearValidator),
      new Field(`${TABLE}.faculty_type`).validator(Validate.values(FACULTY_TYPES)),
      new Field(`${TABLE}.locked`).validator(Validate.values(["0", "1", 0, 1])),
      ...auditFields(TABLE)
    )
    .validator(coursePlanLockValidator);
}

/** GET /api/editor/course-plan?person_number=&academic_year= */
export const GET = withErrorHandler(async (request: Request) => {
  const editor = buildEditor();
  const url = new URL(request.url);
  const personNumber = url.searchParams.get("person_number");
  if (personNumber) {
    editor.where(`${TABLE}.person_number`, personNumber);
  }
  const academicYear = url.searchParams.get("academic_year");
  if (academicYear) {
    editor.where(`${TABLE}.academic_year`, academicYear);
  }
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/course-plan — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
