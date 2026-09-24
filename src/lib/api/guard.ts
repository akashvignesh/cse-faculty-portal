import "server-only";
import { getSession } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { ForbiddenError } from "./errors";

/**
 * Route-level permission gate for endpoints whose READS are restricted (the
 * Editor writes are guarded separately in src/lib/editor/rbac.ts). Throws a
 * 403 ForbiddenError unless the signed-in role holds the permission.
 */
export async function requirePermission(permission: Permission): Promise<void> {
  const session = await getSession();
  if (!hasPermission(session.role, permission)) {
    throw new ForbiddenError(`Your role (${session.role}) does not have ${permission} access.`);
  }
}
