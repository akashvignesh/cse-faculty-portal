export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Editor, { Field, Validate } from "datatables.net-editor-server";
import { withErrorHandler } from "@/lib/api/errors";
import { parseEditorBody } from "@/lib/editor/body";
import { auditFields, createEditor } from "@/lib/editor/factory";
import { semesterPlanLockValidator } from "@/lib/editor/locks";

// Semester slots (Teaching / Not Teaching + comment) hanging off a course-plan
// header. Slot deletes cascade from the header (ON DELETE CASCADE).
const TABLE = "cfp_faculty_semester_plan";
const PLAN = "cfp_faculty_course_plan";

const TERMS = ["summer", "fall", "spring"];
const SLOT_STATUSES = ["Teaching", "Not Teaching"];

function buildEditor(): Editor {
  return createEditor(TABLE, "semester_plan_id")
    .fields(
      // Pkey as read-only field so GET rows are self-describing.
      new Field(`${TABLE}.semester_plan_id`).set(false),
      new Field(`${TABLE}.course_plan_id`)
        .validator(Validate.notEmpty())
        .validator(Validate.numeric()),
      new Field(`${TABLE}.term`).validator(Validate.notEmpty()).validator(Validate.values(TERMS)),
      new Field(`${TABLE}.slot_status`)
        .validator(Validate.notEmpty())
        .validator(Validate.values(SLOT_STATUSES)),
      new Field(`${TABLE}.slot_comment`).validator(Validate.maxLen(60)),
      ...auditFields(TABLE),
      // Read-only header columns for display/filtering.
      new Field(`${PLAN}.person_number`).set(false),
      new Field(`${PLAN}.academic_year`).set(false),
      new Field(`${PLAN}.locked`).set(false)
    )
    .leftJoin(PLAN, `${PLAN}.course_plan_id`, "=", `${TABLE}.course_plan_id`)
    .validator(semesterPlanLockValidator);
}

/** GET /api/editor/semester-plan?person_number=&academic_year=&course_plan_id= */
export const GET = withErrorHandler(async (request: Request) => {
  const editor = buildEditor();
  const url = new URL(request.url);
  const coursePlanId = url.searchParams.get("course_plan_id");
  if (coursePlanId) {
    editor.where(`${TABLE}.course_plan_id`, coursePlanId);
  }
  const personNumber = url.searchParams.get("person_number");
  if (personNumber) {
    editor.where(`${PLAN}.person_number`, personNumber);
  }
  const academicYear = url.searchParams.get("academic_year");
  if (academicYear) {
    editor.where(`${PLAN}.academic_year`, academicYear);
  }
  await editor.process({});
  return NextResponse.json(editor.data());
});

/** POST /api/editor/semester-plan — Editor protocol create/edit/remove */
export const POST = withErrorHandler(async (request: Request) => {
  const body = await parseEditorBody(request);
  const editor = buildEditor();
  await editor.process(body);
  return NextResponse.json(editor.data());
});
