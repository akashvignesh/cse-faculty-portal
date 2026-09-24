// Shared vocabulary for committee assignments stored in committees.members.
//
// members.role is a free-text VARCHAR(16); the portal writes only the strings
// below. Loading is tolerant: any unrecognised legacy value on a committee
// column displays as Member, and any row on a leadership column counts as the
// position holder ("X").
//
// Imported by both the browser-side matrix service and the API route, so this
// module must stay isomorphic (no "server-only").

/** UI cell codes: "X" on role columns, "R"/"C"/"V"/"M" on committee columns. */
export type MatrixCellCode = "" | "X" | "R" | "C" | "V" | "M";

export const MEMBER_ROLE = {
  chair: "Chair",
  viceChair: "Vice Chair",
  member: "Member",
  /** Generic "role in committee" (matrix code R). */
  role: "Role",
  /** Holds a leadership position (matrix code X on the Roles columns). */
  position: "Position",
} as const;

/** Every role string the portal is allowed to write into members.role. */
export const ALLOWED_MEMBER_ROLES: readonly string[] = Object.values(MEMBER_ROLE);

/** members.role → matrix cell code, given the column the row belongs to. */
export function dbRoleToUiCode(
  role: string | null | undefined,
  columnType: "role" | "committee"
): MatrixCellCode {
  const normalized = (role ?? "").trim().toLowerCase();
  if (!normalized) return "";
  if (columnType === "role") {
    // Any membership row on a leadership column marks the position holder.
    return "X";
  }
  switch (normalized) {
    case "chair":
    case "co-chair":
    case "co chair":
      return "C";
    case "vice chair":
    case "vice-chair":
      return "V";
    case "role":
    case "position":
      return "R";
    default:
      // "Member" and any legacy free-text value display as Member.
      return "M";
  }
}

/**
 * True when `stored` is a legacy role string the portal cannot write back
 * (anything outside ALLOWED_MEMBER_ROLES) that already displays as the same
 * committee-column code as `submitted`.
 *
 * The live table holds values such as "Co-Chair", which reads as C but whose
 * only writable equivalent is "Chair". Without this check, editing any cell on
 * such a row would silently flatten the stored value — a one-way loss, since
 * the UI can never produce "Co-Chair" again. Callers keep the stored role when
 * this returns true; a genuine cell change maps to a different code and so
 * still overwrites.
 */
export function isEquivalentLegacyRole(
  stored: string | null | undefined,
  submitted: string
): boolean {
  const current = (stored ?? "").trim();
  if (!current || ALLOWED_MEMBER_ROLES.includes(current)) return false;
  return dbRoleToUiCode(current, "committee") === dbRoleToUiCode(submitted, "committee");
}

/** Matrix cell code → the members.role string to persist. */
export function uiCodeToDbRole(uiCode: MatrixCellCode): string {
  switch (uiCode) {
    case "X":
      return MEMBER_ROLE.position;
    case "R":
      return MEMBER_ROLE.role;
    case "C":
      return MEMBER_ROLE.chair;
    case "V":
      return MEMBER_ROLE.viceChair;
    default:
      return MEMBER_ROLE.member;
  }
}
