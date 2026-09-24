import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type Editor from "datatables.net-editor-server";
import type { IDtRequest } from "datatables.net-editor-server";
import { ConflictError, ForbiddenError } from "@/lib/api/errors";
import type { Session } from "@/lib/auth";
import { chairAssignmentGuard, lastChairValidator } from "@/lib/editor/lastChair";
import { permissionsForRole, type Role } from "@/lib/permissions";

function makeEditor(roleRows: { user_role_id: number; role: string }[]): Editor {
  const db = (_table: string) => {
    let filtered = roleRows;
    const chain = {
      where(column: string, value: string) {
        filtered = filtered.filter((row) => String(row[column as "role"]) === value);
        return chain;
      },
      whereIn(column: string, ids: unknown[]) {
        const wanted = new Set(ids.map(String));
        filtered = filtered.filter((row) => wanted.has(String(row[column as "user_role_id"])));
        return chain;
      },
      select() {
        return Promise.resolve(filtered.map((row) => ({ user_role_id: row.user_role_id })));
      },
    };
    return chain;
  };
  return { db: () => db } as unknown as Editor;
}

function session(role: Role): Session {
  return { userid: "actor", role, permissions: permissionsForRole(role), personNumber: null };
}

function http(action: string, data?: Record<string, unknown>): IDtRequest {
  return { action, data } as unknown as IDtRequest;
}

const ONE_CHAIR = [
  { user_role_id: 1, role: "chair" },
  { user_role_id: 2, role: "staff" },
];
const TWO_CHAIRS = [
  { user_role_id: 1, role: "chair" },
  { user_role_id: 2, role: "chair" },
];

describe("lastChairValidator", () => {
  it("ignores reads and creates", async () => {
    await expect(lastChairValidator(makeEditor(ONE_CHAIR), "", http("create", {}))).resolves.toBe(
      true
    );
    await expect(
      lastChairValidator(makeEditor(ONE_CHAIR), "", { action: undefined } as IDtRequest)
    ).resolves.toBe(true);
  });

  it("blocks removing the only chair", async () => {
    await expect(
      lastChairValidator(makeEditor(ONE_CHAIR), "", http("remove", { row_1: {} }))
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows removing one of two chairs", async () => {
    await expect(
      lastChairValidator(makeEditor(TWO_CHAIRS), "", http("remove", { row_1: {} }))
    ).resolves.toBe(true);
  });

  it("blocks removing both chairs at once", async () => {
    await expect(
      lastChairValidator(makeEditor(TWO_CHAIRS), "", http("remove", { row_1: {}, row_2: {} }))
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("blocks demoting the only chair", async () => {
    await expect(
      lastChairValidator(
        makeEditor(ONE_CHAIR),
        "",
        http("edit", { row_1: { cfp_user_role: { role: "staff" } } })
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows demoting the chair while promoting another in the same request", async () => {
    await expect(
      lastChairValidator(
        makeEditor(ONE_CHAIR),
        "",
        http("edit", {
          row_1: { cfp_user_role: { role: "staff" } },
          row_2: { cfp_user_role: { role: "chair" } },
        })
      )
    ).resolves.toBe(true);
  });

  it("allows edits that do not touch a chair row", async () => {
    await expect(
      lastChairValidator(
        makeEditor(ONE_CHAIR),
        "",
        http("edit", { row_2: { cfp_user_role: { role: "viewer" } } })
      )
    ).resolves.toBe(true);
  });

  it("allows removing a non-chair row", async () => {
    await expect(
      lastChairValidator(makeEditor(ONE_CHAIR), "", http("remove", { row_2: {} }))
    ).resolves.toBe(true);
  });
});

describe("chairAssignmentGuard (staff cannot touch chairs)", () => {
  const run = (role: Role, request: IDtRequest, rows = ONE_CHAIR) =>
    chairAssignmentGuard(session(role))(makeEditor(rows), "", request);

  it("lets a chair do anything", async () => {
    await expect(
      run("chair", http("create", { "0": { cfp_user_role: { userid: "x", role: "chair" } } }))
    ).resolves.toBe(true);
    await expect(
      run("chair", http("edit", { row_1: { cfp_user_role: { role: "staff" } } }))
    ).resolves.toBe(true);
  });

  it("blocks staff from granting the chair role (create)", async () => {
    await expect(
      run("staff", http("create", { "0": { cfp_user_role: { userid: "x", role: "chair" } } }))
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("blocks staff from promoting an existing row to chair (edit)", async () => {
    await expect(
      run("staff", http("edit", { row_2: { cfp_user_role: { role: "chair" } } }))
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("blocks staff from editing or removing a current chair row", async () => {
    await expect(
      run("staff", http("edit", { row_1: { cfp_user_role: { role: "staff" } } }))
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(run("staff", http("remove", { row_1: {} }))).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  it("lets staff manage non-chair users", async () => {
    await expect(
      run("staff", http("create", { "0": { cfp_user_role: { userid: "x", role: "faculty" } } }))
    ).resolves.toBe(true);
    await expect(
      run("staff", http("edit", { row_2: { cfp_user_role: { role: "viewer" } } }))
    ).resolves.toBe(true);
    await expect(run("staff", http("remove", { row_2: {} }))).resolves.toBe(true);
  });
});
