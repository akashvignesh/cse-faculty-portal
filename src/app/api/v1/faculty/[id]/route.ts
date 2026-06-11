export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NotFoundError, withErrorHandler } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getDataSource } from "@/server/data";

interface RouteContext {
  params: { id: string };
}

/** GET /api/v1/faculty/{personNumber|userid} */
export const GET = withErrorHandler<RouteContext>(async (_request, context) => {
  const { id } = await context.params;
  const dataSource = await getDataSource();

  const faculty = await dataSource.getFacultyDetail(id);
  if (!faculty) {
    throw new NotFoundError(`Faculty not found with identifier: ${id}`);
  }

  return ok("Faculty details fetched successfully", faculty);
});
