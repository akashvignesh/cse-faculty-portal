import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type Editor from "datatables.net-editor-server";
import type { IDtRequest } from "datatables.net-editor-server";
import { ForbiddenError } from "@/lib/api/errors";
import type { Session } from "@/lib/auth";
import { permissionsForRole, type Role } from "@/lib/permissions";
import { rbacValidator, type EditorRbacDescriptor } from "@/lib/editor/rbac";

// Minimal knex-shaped fake: db(table).whereIn(col, ids).select(...cols)
// resolves to the matching stub rows.
function makeEditor(tables: Record<string, Record<string, unknown>[]>): Editor {
  const db = (table: string) => {
    let filtered = tables[table] ?? [];
    const chain = {
      whereIn(column: string, ids: unknown[]) {
        const wanted = new Set(ids.map(String));
        filtered = filtered.filter((row) => wanted.has(String(row[column])));
        return chain;
      },
      select(...columns: string[]) {
        return Promise.resolve(
          filtered.map((row) =>
            Object.fromEntries(columns.map((column) => [column, row[column]]))
          )
        );
      },
    };
    return chain;
  };
  return { db: () => db } as unknown as Editor;
}

function session(role: Role, userid = "jdoe", personNumber: string | null = "10000001"): Session {
  return { userid, role, permissions: permissionsForRole(role), personNumber };
}

function http(action: string | undefined, data?: Record<string, unknown>): IDtRequest {
  return { action, data } as unknown as IDtRequest;
}

// Committee assignments are chair-only (no own tier for anyone else).
const ASSIGNMENT: EditorRbacDescriptor = {
  resource: "committee-assignment",
  ownership: "userid",
};
// Faculty roles carry the own tier exercised by the ownership mechanics.
const ROLE: EditorRbacDescriptor = { resource: "faculty-role", ownership: "person_number" };
const PLAN: EditorRbacDescriptor = { resource: "course-plan", ownership: "person_number" };
const SLOT: EditorRbacDescriptor = { resource: "course-plan", ownership: "via-course-plan" };
const LEAVE: EditorRbacDescriptor = { resource: "faculty-leave" };

async function run(
  descriptor: EditorRbacDescriptor,
  who: Session,
  request: IDtRequest,
  tables: Record<string, Record<string, unknown>[]> = {},
  table = "cfp_committee_assignment",
  pkey = "assignment_id"
) {
  const validator = rbacValidator(who, table, pkey, descriptor);
  return validator(makeEditor(tables), request.action ?? "", request);
}

function runRole(
  who: Session,
  request: IDtRequest,
  tables: Record<string, Record<string, unknown>[]> = {}
) {
  return run(ROLE, who, request, tables, "cfp_faculty_role", "role_id");
}

describe("rbacValidator", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("passes reads (no write action) for every role", async () => {
    await expect(run(ASSIGNMENT, session("viewer"), http(undefined))).resolves.toBe(true);
    await expect(run(LEAVE, session("viewer"), http(undefined))).resolves.toBe(true);
  });

  it("passes writes for the all tier", async () => {
    // Committee assignments: only the chair.
    const assignment = http("create", {
      "0": { cfp_committee_assignment: { userid: "someone" } },
    });
    await expect(run(ASSIGNMENT, session("chair"), assignment)).resolves.toBe(true);

    // Staff has the all tier on non-committee resources such as leave.
    const leave = http("create", {
      "0": { cfp_faculty_leave: { person_number: "99999999" } },
    });
    await expect(
      run(LEAVE, session("staff"), leave, {}, "cfp_faculty_leave", "leave_id")
    ).resolves.toBe(true);
  });

  it("committee assignments are chair-only: staff, faculty, viewer all throw 403", async () => {
    const ownRow = http("create", {
      "0": { cfp_committee_assignment: { userid: "jdoe" } },
    });
    for (const role of ["staff", "faculty", "viewer"] as Role[]) {
      await expect(run(ASSIGNMENT, session(role), ownRow)).rejects.toBeInstanceOf(ForbiddenError);
    }
  });

  it("throws 403 for the none tier (faculty on leave)", async () => {
    const request = http("create", {
      "0": { cfp_faculty_leave: { person_number: "10000001" } },
    });
    await expect(
      run(LEAVE, session("faculty"), request, {}, "cfp_faculty_leave", "leave_id")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("faculty may create their own row (own tier)", async () => {
    const request = http("create", {
      "0": { cfp_faculty_role: { person_number: "10000001", role: "Chair" } },
    });
    await expect(runRole(session("faculty"), request)).resolves.toBe(true);
  });

  it("faculty may not create a row for someone else, or omit the owner", async () => {
    const other = http("create", {
      "0": { cfp_faculty_role: { person_number: "99999999" } },
    });
    await expect(runRole(session("faculty"), other)).rejects.toBeInstanceOf(ForbiddenError);
    const missing = http("create", {
      "0": { cfp_faculty_role: { role: "Chair" } },
    });
    await expect(runRole(session("faculty"), missing)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("faculty may edit their own existing row but not someone else's", async () => {
    const tables = {
      cfp_faculty_role: [
        { role_id: 7, person_number: "10000001" },
        { role_id: 8, person_number: "99999999" },
      ],
    };
    const own = http("edit", { row_7: { cfp_faculty_role: { role: "DGS, DGA, DUS" } } });
    await expect(runRole(session("faculty"), own, tables)).resolves.toBe(true);

    const theirs = http("edit", { row_8: { cfp_faculty_role: { role: "DGS, DGA, DUS" } } });
    await expect(runRole(session("faculty"), theirs, tables)).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  it("rejects reassigning an owned row to someone else on edit", async () => {
    const tables = {
      cfp_faculty_role: [{ role_id: 7, person_number: "10000001" }],
    };
    const request = http("edit", {
      row_7: { cfp_faculty_role: { person_number: "99999999" } },
    });
    await expect(runRole(session("faculty"), request, tables)).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  it("faculty may remove only their own rows", async () => {
    const tables = {
      cfp_faculty_role: [
        { role_id: 7, person_number: "10000001" },
        { role_id: 8, person_number: "99999999" },
      ],
    };
    await expect(runRole(session("faculty"), http("remove", { row_7: {} }), tables)).resolves.toBe(
      true
    );
    await expect(
      runRole(session("faculty"), http("remove", { row_7: {}, row_8: {} }), tables)
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("denies rows that do not exist (cannot be verified)", async () => {
    const request = http("edit", { row_99: { cfp_faculty_role: { role: "Chair" } } });
    await expect(
      runRole(session("faculty"), request, { cfp_faculty_role: [] })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("person_number ownership requires a linked person number", async () => {
    const request = http("create", {
      "0": { cfp_faculty_course_plan: { person_number: "10000001" } },
    });
    await expect(
      run(
        PLAN,
        session("faculty", "jdoe", null),
        request,
        {},
        "cfp_faculty_course_plan",
        "course_plan_id"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      run(PLAN, session("faculty"), request, {}, "cfp_faculty_course_plan", "course_plan_id")
    ).resolves.toBe(true);
  });

  it("via-course-plan checks the parent plan header's owner", async () => {
    const tables = {
      cfp_faculty_semester_plan: [{ semester_plan_id: 3, course_plan_id: 21 }],
      cfp_faculty_course_plan: [
        { course_plan_id: 21, person_number: "10000001" },
        { course_plan_id: 22, person_number: "99999999" },
      ],
    };
    // Editing a slot on the faculty member's own plan passes.
    await expect(
      run(
        SLOT,
        session("faculty"),
        http("edit", { row_3: { cfp_faculty_semester_plan: { slot_status: "Teaching" } } }),
        tables,
        "cfp_faculty_semester_plan",
        "semester_plan_id"
      )
    ).resolves.toBe(true);
    // Creating a slot on someone else's plan throws.
    await expect(
      run(
        SLOT,
        session("faculty"),
        http("create", { "0": { cfp_faculty_semester_plan: { course_plan_id: 22 } } }),
        tables,
        "cfp_faculty_semester_plan",
        "semester_plan_id"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
    // Creating a slot without naming a plan throws (deny by default).
    await expect(
      run(
        SLOT,
        session("faculty"),
        http("create", { "0": { cfp_faculty_semester_plan: { slot_status: "Teaching" } } }),
        tables,
        "cfp_faculty_semester_plan",
        "semester_plan_id"
      )
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
