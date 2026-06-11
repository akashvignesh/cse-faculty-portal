import "server-only";
import { env } from "./env";

export interface CurrentUser {
  userid: string;
}

/**
 * Authentication seam. There is no real auth yet — every request acts as
 * DEV_USERID. When UB SSO/Shibboleth lands, replace this with a session
 * lookup; all audit stamping already flows through here.
 */
export function getCurrentUser(): CurrentUser {
  return { userid: env.DEV_USERID };
}
