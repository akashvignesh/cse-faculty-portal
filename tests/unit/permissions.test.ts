import { describe, expect, it } from "vitest";
import {
  canEdit,
  hasPermission,
  isRole,
  permissionsForRole,
  ROLES,
  type Permission,
  type Resource,
  type Role,
} from "@/lib/permissions";

const ALL_PERMISSIONS: Permission[] = [
  "course-plan:edit",
  "course-plan:edit-own",
  "faculty-role:edit",
  "faculty-role:edit-own",
  "committee:view",
  "committee-assignment:edit",
  "committee-assignment:edit-own",
  "committee-catalog:edit",
  "service-summary:edit",
  "service-summary:edit-own",
  "service-categories:edit",
  "faculty-leave:edit",
  "course-tags:edit",
  "teaching-prefs:edit",
  "teaching-prefs:edit-own",
  "profile:edit",
  "profile:edit-own",
  "user-role:edit",
];

describe("hasPermission truth table", () => {
  it("chair has every permission", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission("chair", permission), permission).toBe(true);
    }
  });

  it("staff edits everything dept-wide except committee management and user roles", () => {
    const excluded: Permission[] = [
      "committee:view",
      "committee-assignment:edit",
      "committee-assignment:edit-own",
      "committee-catalog:edit",
      "service-summary:edit",
      "service-summary:edit-own",
      "service-categories:edit",
    ];
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission("staff", permission), permission).toBe(!excluded.includes(permission));
    }
  });

  it("faculty has only own-edit permissions, and none for committee or leave", () => {
    const allowed: Permission[] = [
      "course-plan:edit-own",
      "faculty-role:edit-own",
      "teaching-prefs:edit-own",
      "profile:edit-own",
    ];
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission("faculty", permission), permission).toBe(allowed.includes(permission));
    }
  });

  it("viewer has no permissions", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(hasPermission("viewer", permission), permission).toBe(false);
    }
  });

  it("denies by default for unknown/absent roles", () => {
    expect(hasPermission(null, "course-plan:edit")).toBe(false);
    expect(hasPermission(undefined, "course-plan:edit")).toBe(false);
    expect(hasPermission("root" as Role, "course-plan:edit")).toBe(false);
  });
});

describe("canEdit tiers", () => {
  const cases: [Role, Resource, string][] = [
    ["chair", "course-plan", "all"],
    ["chair", "faculty-role", "all"],
    ["chair", "user-role", "all"],
    ["staff", "course-plan", "all"],
    ["staff", "faculty-role", "all"],
    ["staff", "committee-assignment", "none"],
    ["staff", "committee-catalog", "none"],
    ["staff", "service-summary", "none"],
    ["staff", "service-categories", "none"],
    ["staff", "faculty-leave", "all"],
    ["staff", "user-role", "all"],
    ["faculty", "course-plan", "own"],
    ["faculty", "committee-assignment", "none"],
    ["faculty", "faculty-leave", "none"],
    ["chair", "profile", "all"],
    ["staff", "profile", "all"],
    ["faculty", "profile", "own"],
    ["viewer", "profile", "none"],
    ["faculty", "course-tags", "none"],
    ["faculty", "committee-catalog", "none"],
    ["viewer", "course-plan", "none"],
    ["viewer", "committee-assignment", "none"],
  ];

  it.each(cases)("%s × %s → %s", (role, resource, tier) => {
    expect(canEdit(role, resource)).toBe(tier);
  });

  it("returns none for unknown roles", () => {
    expect(canEdit(null, "course-plan")).toBe("none");
    expect(canEdit("root" as Role, "course-plan")).toBe("none");
  });
});

describe("permissionsForRole / isRole", () => {
  it("returns a copy, never the internal array", () => {
    const first = permissionsForRole("faculty");
    first.push("user-role:edit");
    expect(permissionsForRole("faculty")).not.toContain("user-role:edit");
  });

  it("empty for unknown roles", () => {
    expect(permissionsForRole("root" as Role)).toEqual([]);
    expect(permissionsForRole(null)).toEqual([]);
  });

  it("isRole accepts exactly the four roles", () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(1)).toBe(false);
  });
});
