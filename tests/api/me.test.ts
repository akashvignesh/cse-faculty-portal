import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// /api/v1/me in mock mode (FACULTY_DATA_MODE=local): the role fallback chain
// is explicit mock row → mock roster fallback (faculty) → viewer.

interface MePayload {
  success: boolean;
  data: {
    userid: string;
    role: string;
    permissions: string[];
    personNumber: string | null;
    devSwitcher: { enabled: boolean; roles: string[] };
  };
}

async function fetchMe(userid: string): Promise<MePayload> {
  vi.resetModules();
  process.env.FACULTY_DATA_MODE = "local";
  process.env.DEV_USERID = userid;
  delete process.env.DEV_ROLE;
  const route = await import("@/app/api/v1/me/route");
  const response = await route.GET(new Request("http://test/api/v1/me"), {});
  expect(response.status).toBe(200);
  return (await response.json()) as MePayload;
}

describe("GET /api/v1/me (mock mode)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("resolves an explicit mock role row (chair)", async () => {
    const payload = await fetchMe("jsmith");
    expect(payload.data.role).toBe("chair");
    expect(payload.data.permissions).toContain("user-role:edit");
    expect(payload.data.personNumber).toBe("10000001");
  });

  it("resolves an explicit staff row without any committee permissions", async () => {
    const payload = await fetchMe("abrown");
    expect(payload.data.role).toBe("staff");
    expect(payload.data.permissions).toContain("faculty-role:edit");
    expect(payload.data.permissions).toContain("faculty-leave:edit");
    expect(payload.data.permissions).not.toContain("committee:view");
    expect(payload.data.permissions).not.toContain("committee-assignment:edit");
    expect(payload.data.permissions).not.toContain("committee-assignment:edit-own");
    // Staff can now manage users (chair appointment is still guarded server-side).
    expect(payload.data.permissions).toContain("user-role:edit");
  });

  it("falls back to faculty for roster members without an explicit row", async () => {
    const payload = await fetchMe("roshana");
    expect(payload.data.role).toBe("faculty");
    expect(payload.data.permissions).toContain("course-plan:edit-own");
    expect(payload.data.permissions).not.toContain("course-plan:edit");
    expect(payload.data.permissions).not.toContain("committee:view");
    expect(payload.data.permissions).not.toContain("faculty-leave:edit");
  });

  it("falls back to viewer for unknown userids", async () => {
    const payload = await fetchMe("nobody");
    expect(payload.data.role).toBe("viewer");
    expect(payload.data.permissions).toEqual([]);
    expect(payload.data.personNumber).toBeNull();
  });

  it("DEV_ROLE overrides the lookup", async () => {
    vi.resetModules();
    process.env.FACULTY_DATA_MODE = "local";
    process.env.DEV_USERID = "nobody";
    process.env.DEV_ROLE = "staff";
    const route = await import("@/app/api/v1/me/route");
    const response = await route.GET(new Request("http://test/api/v1/me"), {});
    const payload = (await response.json()) as MePayload;
    expect(payload.data.role).toBe("staff");
    delete process.env.DEV_ROLE;
  });
});
