import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { env, isDevSwitcherEnabled } from "./env";
import { permissionsForRole, type Permission, type Role } from "./permissions";
import { getDataSource } from "@/server/data";

/**
 * Authentication seam. There is no real auth yet — identity comes from the
 * dev switcher cookie (when enabled) or DEV_USERID. When UB SSO/Shibboleth
 * lands, replace only the userid resolution below; role lookup, permission
 * expansion, and audit stamping already flow through getSession().
 */

export const DEV_COOKIE_NAME = "cfp-dev-user";

export interface Session {
  userid: string;
  role: Role;
  permissions: Permission[];
  /** Identity in the course-plan/leave key space; null when unmapped. */
  personNumber: string | null;
}

const devCookieSchema = z.object({
  userid: z.string().min(1).max(8),
  role: z.enum(["chair", "staff", "faculty", "viewer"]).optional(),
});

type DevCookie = z.infer<typeof devCookieSchema>;

async function readDevCookie(): Promise<DevCookie | null> {
  if (!isDevSwitcherEnabled) return null;
  try {
    // cookies() throws outside a request scope (e.g. unit tests importing a
    // route module) — treat that the same as no cookie.
    const raw = (await cookies()).get(DEV_COOKIE_NAME)?.value;
    if (!raw) return null;
    const parsed = devCookieSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session> {
  const devCookie = await readDevCookie();
  const userid = (devCookie?.userid ?? env.DEV_USERID).trim();

  const dataSource = await getDataSource();
  const role: Role =
    devCookie?.role ?? env.DEV_ROLE ?? (await dataSource.getUserRole(userid)) ?? "viewer";
  const personNumber = await dataSource.resolvePersonNumber(userid);

  return {
    userid,
    role,
    permissions: permissionsForRole(role),
    personNumber,
  };
}
