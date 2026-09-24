// RBAC integration tests for the committee-assignment route against the real
// database. Skipped unless RUN_DB_TESTS=1 (requires the SSH tunnel +
// FACULTY_DATA_MODE=db and the cfp_* migration applied to a dev database).
//
//   $env:RUN_DB_TESTS="1"; $env:FACULTY_DATA_MODE="db"; npx vitest run tests/api
//
// Committee management is chair-only, so every non-chair action must 403 —
// reads included (committee:view). Storage is committees.members, which holds
// real departmental rows: every write here is scoped to the synthetic userids
// below and removed in afterAll.
//
// The userids must differ from the ones in editorRoutes.db.test.ts — vitest
// runs the two files concurrently against the same table, and sharing an id
// makes the "left a row behind" assertion race the other suite.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const runDbTests = process.env.RUN_DB_TESTS === "1";
const describeDb = runDbTests ? describe : describe.skip;

const TEST_USER = "rbactest";
const OTHER_USER = "rbactst2";

/** Re-imports the route with a fresh env so DEV_USERID/DEV_ROLE apply. */
async function routeAs(role: string, userid: string) {
  vi.resetModules();
  process.env.DEV_ROLE = role;
  process.env.DEV_USERID = userid;
  return import("@/app/api/editor/committee-assignments/route");
}

async function db() {
  const { getDb } = await import("@/lib/db");
  return getDb();
}

/** A real committee to hang the test memberships off. */
async function firstCommitteeId(): Promise<number> {
  const row = await (await db())
    .select("id")
    .from("committees.committees")
    .orderBy("id")
    .first<{ id: number }>();
  if (!row) throw new Error("committees.committees is empty");
  return row.id;
}

function createBody(userid: string, committeeId: number, role = "Member") {
  return JSON.stringify({
    action: "create",
    data: { "0": { members: { committee_id: committeeId, userid, role } } },
  });
}

function editBody(rowId: number, role: string) {
  return JSON.stringify({
    action: "edit",
    data: { [`row_${rowId}`]: { members: { role } } },
  });
}

function post(body: string) {
  return new Request("http://test/api/editor/committee-assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function get(query = "") {
  return new Request(`http://test/api/editor/committee-assignments${query}`);
}

async function cleanup() {
  await (await db())("committees.members").whereIn("userid", [TEST_USER, OTHER_USER]).delete();
}

describeDb("committee-assignment route RBAC (db mode)", () => {
  let committeeId: number;

  beforeAll(async () => {
    committeeId = await firstCommitteeId();
    await cleanup(); // leftovers from an interrupted run
  });

  afterAll(async () => {
    vi.resetModules();
    await cleanup();
    await (await db()).destroy();
    delete process.env.DEV_ROLE;
  });

  it("viewer create → 403 with the fail envelope", async () => {
    const route = await routeAs("viewer", TEST_USER);
    const response = await route.POST(post(createBody(TEST_USER, committeeId)), {});
    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(String(payload.message)).toMatch(/does not have|cannot modify/i);
  });

  it("faculty create even for their own userid → 403 (committee is chair-only)", async () => {
    const route = await routeAs("faculty", TEST_USER);
    const response = await route.POST(post(createBody(TEST_USER, committeeId)), {});
    expect(response.status).toBe(403);
    expect((await response.json()).success).toBe(false);
  });

  it("staff create for someone else → 403 (committee is chair-only)", async () => {
    const route = await routeAs("staff", TEST_USER);
    const response = await route.POST(post(createBody(OTHER_USER, committeeId)), {});
    expect(response.status).toBe(403);
  });

  it("non-chair GET of committee data → 403 (committee:view)", async () => {
    const route = await routeAs("staff", TEST_USER);
    const response = await route.GET(get(), {});
    expect(response.status).toBe(403);
  });

  it("no non-chair request left a row behind", async () => {
    const rows = await (await db())("committees.members").whereIn("userid", [
      TEST_USER,
      OTHER_USER,
    ]);
    expect(rows).toHaveLength(0);
  });

  it("chair GET → 200", async () => {
    const route = await routeAs("chair", TEST_USER);
    const response = await route.GET(get(`?userid=${OTHER_USER}`), {});
    expect(response.status).toBe(200);
  });

  it("chair create for someone else → 200, audit column records the chair", async () => {
    const route = await routeAs("chair", TEST_USER);
    const response = await route.POST(post(createBody(OTHER_USER, committeeId)), {});
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.fieldErrors).toBeUndefined();
    expect(payload.data?.[0]?.members?.userid).toBe(OTHER_USER);

    const stored = await (await db())("committees.members")
      .where({ committee_id: committeeId, userid: OTHER_USER })
      .first<{ role: string; editor: string }>();
    expect(stored?.role).toBe("Member");
    expect(stored?.editor).toBe(TEST_USER); // the acting chair, not the subject
  });

  it("chair edit changes the role", async () => {
    const row = await (await db())("committees.members")
      .where({ committee_id: committeeId, userid: OTHER_USER })
      .first<{ id: number }>();
    const route = await routeAs("chair", TEST_USER);
    const response = await route.POST(post(editBody(row!.id, "Vice Chair")), {});
    expect(response.status).toBe(200);
    expect((await response.json()).data?.[0]?.members?.role).toBe("Vice Chair");
  });

  it("rejects a role outside the portal's vocabulary", async () => {
    const route = await routeAs("chair", TEST_USER);
    const response = await route.POST(post(createBody(TEST_USER, committeeId, "Overlord")), {});
    expect(response.status).toBe(200); // Editor protocol reports these in-band
    const payload = await response.json();
    expect(payload.fieldErrors?.[0]?.name).toBe("members.role");
  });

  it("preserves a legacy Co-Chair instead of flattening it to Chair", async () => {
    // Mirrors the 4 live rows (GAC/UGAC). "Chair" is the only writable role the
    // C cell can produce, so an edit must not overwrite the stored value.
    const conn = await db();
    await conn("committees.members").insert({
      committee_id: committeeId,
      userid: TEST_USER,
      role: "Co-Chair",
      editor: TEST_USER,
    });
    const row = await conn("committees.members")
      .where({ committee_id: committeeId, userid: TEST_USER })
      .first<{ id: number }>();

    const route = await routeAs("chair", TEST_USER);
    const response = await route.POST(post(editBody(row!.id, "Chair")), {});
    expect(response.status).toBe(200);

    const after = await conn("committees.members")
      .where("id", row!.id)
      .first<{ role: string }>();
    expect(after?.role).toBe("Co-Chair");
  });

  it("a genuine role change still overwrites the legacy value", async () => {
    const conn = await db();
    const row = await conn("committees.members")
      .where({ committee_id: committeeId, userid: TEST_USER })
      .first<{ id: number }>();

    const route = await routeAs("chair", TEST_USER);
    const response = await route.POST(post(editBody(row!.id, "Member")), {});
    expect(response.status).toBe(200);

    const after = await conn("committees.members")
      .where("id", row!.id)
      .first<{ role: string }>();
    expect(after?.role).toBe("Member");
  });

  it("chair remove deletes the rows", async () => {
    const conn = await db();
    const rows = await conn("committees.members").whereIn("userid", [TEST_USER, OTHER_USER]);
    const route = await routeAs("chair", TEST_USER);
    const body = JSON.stringify({
      action: "remove",
      data: Object.fromEntries(rows.map((r: { id: number }) => [`row_${r.id}`, { members: {} }])),
    });
    const response = await route.POST(post(body), {});
    expect(response.status).toBe(200);

    const left = await conn("committees.members").whereIn("userid", [TEST_USER, OTHER_USER]);
    expect(left).toHaveLength(0);
  });
});
