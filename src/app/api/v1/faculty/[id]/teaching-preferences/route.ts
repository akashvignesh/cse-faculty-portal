export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { BadRequestError, ForbiddenError, withErrorHandler } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { getDataSource } from "@/server/data";
import type { FacultyDataSource, SaveTeachingPreferencesRequest } from "@/server/data/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** RBAC: chair/staff edit anyone's preferences; faculty only their own. */
async function assertCanSavePreferences(dataSource: FacultyDataSource, id: string): Promise<void> {
  const session = await getSession();
  const tier = canEdit(session.role, "teaching-prefs");
  if (tier === "all") return;
  if (tier === "none") {
    throw new ForbiddenError(
      `Your role (${session.role}) cannot modify teaching preferences.`
    );
  }
  const target = id.trim();
  const ownByUserid = target.toLowerCase() === session.userid.toLowerCase();
  const ownByPersonNumber =
    session.personNumber !== null &&
    (await dataSource.resolvePersonNumber(target)) === session.personNumber;
  if (!ownByUserid && !ownByPersonNumber) {
    throw new ForbiddenError("You may only modify your own teaching preferences.");
  }
}

/** GET /api/v1/faculty/{userid|personNumber}/teaching-preferences */
export const GET = withErrorHandler<RouteContext>(async (_request, context) => {
  const { id } = await context.params;
  const dataSource = await getDataSource();

  const preferences = await dataSource.getTeachingPreferences(id);
  return ok("Teaching preferences fetched successfully", preferences);
});

/** POST /api/v1/faculty/{userid|personNumber}/teaching-preferences */
export const POST = withErrorHandler<RouteContext>(async (request, context) => {
  const { id } = await context.params;

  let body: SaveTeachingPreferencesRequest;
  try {
    body = (await request.json()) as SaveTeachingPreferencesRequest;
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }

  const dataSource = await getDataSource();
  await assertCanSavePreferences(dataSource, id);
  const result = await dataSource.saveTeachingPreferences(id, body);
  return ok("Teaching preferences saved successfully", result);
});
