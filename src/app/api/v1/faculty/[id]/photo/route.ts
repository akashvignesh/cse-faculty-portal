export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getDataSource } from "@/server/data";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/faculty/{personNumber|userid}/photo
 *
 * Streams the faculty photo blob from sunycard.cfp_cse_faculty_photos_v.
 * Returns 404 when the person has no photo so the client can fall back to
 * initials via the <img> onError handler. This route returns binary, so it
 * deliberately bypasses the JSON ok()/withErrorHandler envelope.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const dataSource = await getDataSource();
  const photo = await dataSource.getFacultyPhoto(id);

  if (!photo) {
    return new Response(null, { status: 404 });
  }

  return new Response(new Uint8Array(photo.image), {
    status: 200,
    headers: {
      "Content-Type": photo.mime,
      "Content-Length": String(photo.image.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
