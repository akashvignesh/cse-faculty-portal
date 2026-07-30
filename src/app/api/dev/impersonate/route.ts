import { cookies } from "next/headers";
import { z } from "zod";
import { DEV_COOKIE_NAME } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api/errors";
import { fail, ok } from "@/lib/api/response";
import { env, isDevSwitcherEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

// Dev-only role/user impersonation for testing RBAC before SSO lands.
// Inert in production builds (404) unless AUTH_DEV_SWITCHER=1. When
// AUTH_DEV_SWITCHER_SECRET is set (recommended on a deployed test server), the
// caller must present it in the `x-dev-switcher-secret` header.

const bodySchema = z.object({
  userid: z.string().trim().min(1).max(8),
  role: z.enum(["chair", "staff", "faculty", "viewer"]).optional(),
});

export const POST = withErrorHandler(async (request: Request) => {
  if (!isDevSwitcherEnabled) {
    return fail(404, "Not found");
  }
  if (env.AUTH_DEV_SWITCHER_SECRET) {
    const provided = request.headers.get("x-dev-switcher-secret") ?? "";
    // Length-then-value compare; not constant-time, but this is a dev/test gate.
    if (provided !== env.AUTH_DEV_SWITCHER_SECRET) {
      return fail(403, "Invalid or missing test-access key.");
    }
  }
  const body = bodySchema.parse(await request.json());
  (await cookies()).set(DEV_COOKIE_NAME, JSON.stringify(body), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return ok("Impersonation cookie set — reload to apply.", body);
});

export const DELETE = withErrorHandler(async () => {
  if (!isDevSwitcherEnabled) {
    return fail(404, "Not found");
  }
  (await cookies()).delete(DEV_COOKIE_NAME);
  return ok("Impersonation cookie cleared.", null);
});
