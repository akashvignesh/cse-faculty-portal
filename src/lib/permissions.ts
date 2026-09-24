// Role-based access control matrix — the single source of truth shared by the
// server-side editor guard (src/lib/editor/rbac.ts) and the client auth
// context (src/components/auth/AuthProvider.tsx). Intentionally NOT
// "server-only": it contains no secrets, only the policy.
//
// Model: plain RBAC, deny by default. Each editable resource has up to two
// permission tiers — `<resource>:edit` (department-wide) and
// `<resource>:edit-own` (only rows owned by the signed-in person). The server
// is authoritative; UI hiding is UX only.
//
// ── HOW TO CHANGE ACCESS ─────────────────────────────────────────────────────
// Flip the boolean in the ACCESS grid below. One cell = one role's access to
// one permission. Nothing else needs to change — the server guard and every
// UI gate read this grid.

export const ROLES = ["chair", "staff", "faculty", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "course-plan:edit"
  | "course-plan:edit-own"
  | "faculty-role:edit"
  | "faculty-role:edit-own"
  | "committee:view"
  | "committee-assignment:edit"
  | "committee-assignment:edit-own"
  | "committee-catalog:edit"
  | "service-summary:edit"
  | "service-summary:edit-own"
  | "service-categories:edit"
  | "faculty-leave:edit"
  | "course-tags:edit"
  | "teaching-prefs:edit"
  | "teaching-prefs:edit-own"
  | "profile:edit"
  | "profile:edit-own"
  | "user-role:edit";

/** A resource is the prefix shared by an `:edit` / `:edit-own` pair. */
export type Resource =
  | "course-plan"
  | "faculty-role"
  | "committee-assignment"
  | "committee-catalog"
  | "service-summary"
  | "service-categories"
  | "faculty-leave"
  | "course-tags"
  | "teaching-prefs"
  | "profile"
  | "user-role";

type AccessRow = Record<Role, boolean>;

/**
 * The access grid. Policy summary:
 * - chair: everything. Committee management is EXCLUSIVELY the chair's —
 *   nobody else can edit or even open the committee matrix; other roles only
 *   see the read-only Committee tab on faculty profiles, which reflects the
 *   chair's changes.
 * - staff: department-wide edits (course plans, roles, leave, tags, teaching
 *   prefs) EXCEPT committee management and user-role assignments.
 * - faculty: only their own rows (course plan, roles, teaching prefs). Leave
 *   is staff/chair-only.
 * - viewer: read-only faculty info.
 */
export const ACCESS: Record<Permission, AccessRow> = {
  //                                  chair   staff   faculty viewer
  "course-plan:edit":            { chair: true,  staff: true,  faculty: false, viewer: false },
  "course-plan:edit-own":        { chair: true,  staff: true,  faculty: true,  viewer: false },
  "faculty-role:edit":           { chair: true,  staff: true,  faculty: false, viewer: false },
  "faculty-role:edit-own":       { chair: true,  staff: true,  faculty: true,  viewer: false },
  // Committee management is chair-only: the matrix page and its four data
  // endpoints (assignments, catalog, service summary, service categories)
  // require committee:view; the profile Committee tab stays open to all.
  "committee:view":              { chair: true,  staff: false, faculty: false, viewer: false },
  "committee-assignment:edit":   { chair: true,  staff: false, faculty: false, viewer: false },
  "committee-assignment:edit-own": { chair: true, staff: false, faculty: false, viewer: false },
  "committee-catalog:edit":      { chair: true,  staff: false, faculty: false, viewer: false },
  "service-summary:edit":        { chair: true,  staff: false, faculty: false, viewer: false },
  "service-summary:edit-own":    { chair: true,  staff: false, faculty: false, viewer: false },
  "service-categories:edit":     { chair: true,  staff: false, faculty: false, viewer: false },
  "faculty-leave:edit":          { chair: true,  staff: true,  faculty: false, viewer: false },
  "course-tags:edit":            { chair: true,  staff: true,  faculty: false, viewer: false },
  "teaching-prefs:edit":         { chair: true,  staff: true,  faculty: false, viewer: false },
  "teaching-prefs:edit-own":     { chair: true,  staff: true,  faculty: true,  viewer: false },
  // Faculty profile contact fields (personal email/phone/address, research
  // areas). Chair/staff edit anyone; faculty edit only their own; viewer none.
  "profile:edit":                { chair: true,  staff: true,  faculty: false, viewer: false },
  "profile:edit-own":            { chair: true,  staff: true,  faculty: true,  viewer: false },
  // Managing cfp_user_role rows (who has which portal role). Staff may manage
  // users too, but a server guard (chairAssignmentGuard) still restricts
  // appointing/removing CHAIRS to chairs only — staff cannot self-escalate.
  "user-role:edit":              { chair: true,  staff: true,  faculty: false, viewer: false },
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Deny by default: unknown roles and unknown permissions are false. */
export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role || !isRole(role)) return false;
  return ACCESS[permission]?.[role] ?? false;
}

export function permissionsForRole(role: Role | null | undefined): Permission[] {
  if (!role || !isRole(role)) return [];
  return (Object.keys(ACCESS) as Permission[]).filter((permission) => ACCESS[permission][role]);
}

export type EditTier = "all" | "own" | "none";

/**
 * Resolves the `:edit` / `:edit-own` pair for a resource into a tier:
 * "all" = department-wide edit, "own" = only rows the person owns, "none".
 */
export function canEdit(role: Role | null | undefined, resource: Resource): EditTier {
  if (hasPermission(role, `${resource}:edit` as Permission)) return "all";
  if (hasPermission(role, `${resource}:edit-own` as Permission)) return "own";
  return "none";
}
