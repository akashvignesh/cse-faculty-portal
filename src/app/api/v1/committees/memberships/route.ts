export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { BadRequestError, withErrorHandler } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getDataSource } from "@/server/data";

/** GET /api/v1/committees/memberships?userId= */
export const GET = withErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId")?.trim();
  if (!userId) {
    throw new BadRequestError('Query parameter "userId" is required');
  }

  const dataSource = await getDataSource();
  const memberships = await dataSource.getCommitteeMemberships(userId);
  return ok("Committee memberships fetched successfully", memberships);
});
