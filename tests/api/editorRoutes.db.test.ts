// Integration tests for the Editor protocol routes against the real database.
// Skipped unless RUN_DB_TESTS=1 (requires the SSH tunnel + FACULTY_DATA_MODE=db
// and the cfp_* migration applied to a dev database).
//
//   $env:RUN_DB_TESTS="1"; $env:FACULTY_DATA_MODE="db"; npx vitest run tests/api

import { afterAll, describe, expect, it } from "vitest";

const runDbTests = process.env.RUN_DB_TESTS === "1";
const describeDb = runDbTests ? describe : describe.skip;

const TEST_YEAR = "2098-2099"; // far-future year so test rows never collide with real data
const TEST_USER = "vitest";

async function loadRoute(path: string) {
  return import(path);
}

describeDb("editor routes (db mode)", () => {
  afterAll(async () => {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    await db("committees.members").where("userid", TEST_USER).delete();
    await db("cfp_faculty_course_plan").where("academic_year", TEST_YEAR).delete();
    await db.destroy();
  });

  it("creates, edits, and removes a committee assignment", async () => {
    const route = await loadRoute("@/app/api/editor/committee-assignments/route");
    const { getDb } = await import("@/lib/db");
    const committee = await getDb()
      .select("id")
      .from("committees.committees")
      .orderBy("id")
      .first<{ id: number }>();
    expect(committee).toBeDefined();

    // create
    const createResponse = await route.POST(
      new Request("http://test/api/editor/committee-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          data: {
            "0": {
              members: {
                committee_id: committee?.id,
                userid: TEST_USER,
                role: "Member",
              },
            },
          },
        }),
      }),
      {}
    );
    const created = await createResponse.json();
    expect(created.fieldErrors ?? []).toHaveLength(0);
    expect(created.data).toHaveLength(1);
    const rowId = created.data[0].DT_RowId;

    // a role outside the allowed vocabulary is rejected with a fieldError
    const invalidResponse = await route.POST(
      new Request("http://test/api/editor/committee-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          data: { [rowId]: { members: { role: "Emperor" } } },
        }),
      }),
      {}
    );
    const invalid = await invalidResponse.json();
    expect(invalid.fieldErrors?.length).toBeGreaterThan(0);

    // edit
    const editResponse = await route.POST(
      new Request("http://test/api/editor/committee-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          data: { [rowId]: { members: { role: "Chair" } } },
        }),
      }),
      {}
    );
    const edited = await editResponse.json();
    expect(edited.data[0].members.role).toBe("Chair");

    // remove
    const removeResponse = await route.POST(
      new Request("http://test/api/editor/committee-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", data: { [rowId]: {} } }),
      }),
      {}
    );
    expect((await removeResponse.json()).error).toBeUndefined();
  });

  it("blocks semester-plan writes when the course plan is locked", async () => {
    const planRoute = await loadRoute("@/app/api/editor/course-plan/route");
    const slotRoute = await loadRoute("@/app/api/editor/semester-plan/route");

    const planResponse = await planRoute.POST(
      new Request("http://test/api/editor/course-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          data: {
            "0": {
              cfp_faculty_course_plan: {
                person_number: "99999999",
                academic_year: TEST_YEAR,
                faculty_type: "Prof Track",
                locked: "1",
              },
            },
          },
        }),
      }),
      {}
    );
    const plan = await planResponse.json();
    expect(plan.fieldErrors ?? []).toHaveLength(0);
    const planId = plan.data[0].cfp_faculty_course_plan.course_plan_id;

    const slotResponse = await slotRoute.POST(
      new Request("http://test/api/editor/semester-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          data: {
            "0": {
              cfp_faculty_semester_plan: {
                course_plan_id: planId,
                term: "fall",
                slot_status: "Teaching",
                slot_comment: "Regular",
              },
            },
          },
        }),
      }),
      {}
    );
    const slot = await slotResponse.json();
    expect(slot.error).toMatch(/locked/i);
  });
});
