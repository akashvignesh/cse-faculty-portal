export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { withErrorHandler } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getDataSource } from "@/server/data";

/** GET /api/v1/courses/active */
export const GET = withErrorHandler(async () => {
  const dataSource = await getDataSource();
  const courses = await dataSource.getActiveCourses();
  return ok("Active courses fetched successfully", courses);
});
