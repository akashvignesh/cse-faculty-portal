export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getSession } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { env, isDevSwitcherEnabled } from "@/lib/env";
import { ROLES } from "@/lib/permissions";

/** GET /api/v1/me — the signed-in user's identity, role, and permissions. */
export const GET = withErrorHandler(async () => {
  const session = await getSession();
  return ok("Session fetched successfully", {
    userid: session.userid,
    role: session.role,
    permissions: session.permissions,
    personNumber: session.personNumber,
    devSwitcher: {
      enabled: isDevSwitcherEnabled,
      roles: ROLES,
      // The widget prompts for the test-access key when this is true.
      requiresSecret: isDevSwitcherEnabled && Boolean(env.AUTH_DEV_SWITCHER_SECRET),
    },
  });
});
