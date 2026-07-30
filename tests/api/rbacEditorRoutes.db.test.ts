// RBAC integration tests for the Editor routes against the real database.
// Skipped unless RUN_DB_TESTS=1 (requires the SSH tunnel + FACULTY_DATA_MODE=db
// and the cfp_* migration applied to a dev database).
//
//   $env:RUN_DB_TESTS="1"; $env:FACULTY_DATA_MODE="db"; npx vitest run tests/api

import { afterAll, describe, expect, it, vi } from "vitest";

const runDbTests = process.env.RUN_DB_TESTS === "1";
const describeDb = runDbTests ? describe : describe.skip;

const TEST_YEAR = "2097-2098"; // far-future year so test rows never collide with real data
const TEST_USER = "vitest";
const OTHER_USER = "vitest2";

/** Re-imports the route with a fresh env so DEV_USERID/DEV_ROLE apply. */
async function routeAs(role: string, userid: string) {
  vi.resetModules();
  process.env.DEV_ROLE = role;
  process.env.DEV_USERID = userid;
  return import("@/app/api/editor/committee-assignments/route");
}

async function firstCatalogId(): Promise<number> {
  const { getDb } = await import("@/lib/db");
  const row = await getDb()
    .select("catalog_id")
    .from("cfp_committee_catalog")
    .orderBy("catalog_id")
    .first<{ catalog_id: number }>();
  if (!row) throw new Error("cfp_committee_catalog is empty");
  return row.catalog_id;
}

function createBody(userid: string, catalogId: number) {
  return JSON.stringify({
    action: "create",
    data: {
      "0": {
        cfp_committee_assignment: {
          catalog_id: catalogId,
          userid,
          role_code: "X",
          academic_year: TEST_YEAR,
        },
      },
    },
  });
}

function post(body: string) {
  return new Request("http://test/api/editor/committee-assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describeDb("editor routes RBAC (db mode)", () => {
  afterAll(async () => {
    vi.resetModules();
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    await db("cfp_committee_assignment").where("academic_year", TEST_YEAR).delete();
    await db.destroy();
    delete process.env.DEV_ROLE;
  });

  it("viewer create → 403 with the fail envelope", async () => {
    const route = await routeAs("viewer", TEST_USER);
    const response = await route.POST(post(createBody(TEST_USER, await firstCatalogId())), {});
    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.success).toBe(false);
    expect(String(payload.message)).toMatch(/cannot modify/i);
  });

  it("faculty create even for their own userid → 403 (committee is chair-only)", async () => {
    const route = await routeAs("faculty", TEST_USER);
    const response = await route.POST(post(createBody(TEST_USER, await firstCatalogId())), {});
    expect(response.status).toBe(403);
    const payload = await response.json();
    expect(payload.success).toBe(false);
  });

  it("staff create for someone else → 403 (committee is chair-only)", async () => {
    const route = await routeAs("staff", TEST_USER);
    const response = await route.POST(post(createBody(OTHER_USER, await firstCatalogId())), {});
    expect(response.status).toBe(403);
  });

  it("non-chair GET of committee data → 403 (committee:view)", async () => {
    const route = await routeAs("staff", TEST_USER);
    const response = await route.GET(
      new Request("http://test/api/editor/committee-assignments"),
      {}
    );
    expect(response.status).toBe(403);
  });

  it("chair create for someone else → 200, audit column records the chair", async () => {
    const route = await routeAs("chair", TEST_USER);
    const response = await route.POST(post(createBody(OTHER_USER, await firstCatalogId())), {});
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.error ?? "").toBe("");
    expect(payload.data?.[0]?.cfp_committee_assignment?.userid).toBe(OTHER_USER);
    expect(payload.data?.[0]?.cfp_committee_assignment?.editor).toBe(TEST_USER);
  });
});
