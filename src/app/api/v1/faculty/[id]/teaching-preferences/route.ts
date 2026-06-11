export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { BadRequestError, withErrorHandler } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getDataSource } from "@/server/data";
import type { SaveTeachingPreferencesRequest } from "@/server/data/types";

interface RouteContext {
  params: { id: string };
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
  const result = await dataSource.saveTeachingPreferences(id, body);
  return ok("Teaching preferences saved successfully", result);
});
