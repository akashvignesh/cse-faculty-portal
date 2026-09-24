export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { BadRequestError, ForbiddenError, withErrorHandler } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getSession, type Session } from "@/lib/auth";
import { profilePatchSchema } from "@/lib/api/profileSchema";
import { canEdit } from "@/lib/permissions";
import { getDataSource } from "@/server/data";
import type { FacultyDataSource } from "@/server/data/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * RBAC for profile writes: chair/staff edit anyone; faculty only their own.
 * The target identity is derived from the ROUTE param resolved server-side —
 * never from the request body — so a crafted payload cannot retarget the edit.
 */
async function assertCanEditProfile(
  dataSource: FacultyDataSource,
  session: Session,
  id: string
): Promise<void> {
  const tier = canEdit(session.role, "profile");
  if (tier === "all") return;
  if (tier === "none") {
    throw new ForbiddenError(`Your role (${session.role}) cannot edit faculty profiles.`);
  }
  const target = id.trim();
  const ownByUserid = target.toLowerCase() === session.userid.toLowerCase();
  const ownByPersonNumber =
    session.personNumber !== null &&
    (await dataSource.resolvePersonNumber(target)) === session.personNumber;
  if (!ownByUserid && !ownByPersonNumber) {
    throw new ForbiddenError("You may only edit your own profile.");
  }
}

/** GET /api/v1/faculty/{userid|personNumber}/profile — editable projection. */
export const GET = withErrorHandler<RouteContext>(async (_request, context) => {
  const { id } = await context.params;
  const dataSource = await getDataSource();
  const profile = await dataSource.getFacultyProfile(id);
  if (!profile) {
    throw new BadRequestError(`No faculty record found for ${id}`);
  }
  return ok("Profile fetched successfully", profile);
});

/** PATCH /api/v1/faculty/{userid|personNumber}/profile — save edited fields. */
export const PATCH = withErrorHandler<RouteContext>(async (request, context) => {
  const { id } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
  const patch = profilePatchSchema.parse(raw);

  const dataSource = await getDataSource();
  const session = await getSession();
  await assertCanEditProfile(dataSource, session, id);

  const saved = await dataSource.saveFacultyProfile(id, patch, session.userid);
  return ok("Profile updated successfully", saved);
});
