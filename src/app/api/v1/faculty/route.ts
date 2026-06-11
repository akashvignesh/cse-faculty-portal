export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { withErrorHandler, BadRequestError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { getDataSource } from "@/server/data";

function intParam(url: URL, name: string, fallback: number): number {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestError(`Query parameter "${name}" must be a non-negative integer`);
  }
  return value;
}

/** GET /api/v1/faculty?page=0&size=10&search= */
export const GET = withErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const dataSource = await getDataSource();

  const result = await dataSource.listFaculty({
    page: intParam(url, "page", 0),
    size: intParam(url, "size", 10),
    search: url.searchParams.get("search") ?? "",
  });

  return ok("Faculty list fetched successfully", result);
});
