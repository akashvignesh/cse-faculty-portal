import "server-only";
import { getDb } from "@/lib/db";
import { isRole, type Role } from "@/lib/permissions";

// RBAC role resolution against ubs_emp.cfp_user_role, with a roster fallback:
// an explicit row wins; a userid without a row that maps to a CSE roster
// member (dce.person_number → cfp_appointments) defaults to "faculty";
// everyone else gets null and the session layer falls back to "viewer".
// CONFIGURABLE: delete rosterFallbackRole() if the department prefers
// explicit role rows only.

const ER_NO_SUCH_TABLE = 1146;

async function explicitRole(userid: string): Promise<Role | null> {
  try {
    const row = await getDb()
      .select("role")
      .from("cfp_user_role")
      .where("userid", userid)
      .first<{ role: string } | undefined>();
    const role = row?.role?.trim().toLowerCase();
    return isRole(role) ? role : null;
  } catch (error) {
    // Tolerate a missing table so the app keeps running before the
    // cfp_user_role migration is applied — everyone falls through.
    if ((error as { errno?: number })?.errno === ER_NO_SUCH_TABLE) {
      return null;
    }
    throw error;
  }
}

async function rosterFallbackRole(userid: string): Promise<Role | null> {
  const row = await getDb()
    .select("pn.person_number")
    .from("dce.person_number as pn")
    .join("cfp_appointments as app", "app.person_number", "pn.person_number")
    .where("pn.principal", userid)
    .first<{ person_number: string } | undefined>();
  return row ? "faculty" : null;
}

export async function getUserRole(userid: string): Promise<Role | null> {
  const normalized = userid.trim();
  if (!normalized) return null;
  const explicit = await explicitRole(normalized);
  if (explicit) return explicit;
  return rosterFallbackRole(normalized);
}
