export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NotFoundError, withErrorHandler } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getDataSource } from "@/server/data";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/v1/faculty/{personNumber|userid}/teaching-history */
export const GET = withErrorHandler<RouteContext>(async (_request, context) => {
  const { id } = await context.params;
  const dataSource = await getDataSource();

  const history = await dataSource.getTeachingHistory(id);
  if (!history) {
    throw new NotFoundError(`Faculty not found with identifier: ${id}`);
  }

  return ok("Teaching history fetched successfully", history);
});
