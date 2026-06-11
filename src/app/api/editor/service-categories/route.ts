export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { withErrorHandler } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { isDbMode } from "@/lib/env";

// cfp_service_categories is a seeded lookup (category → label → points);
// the app never writes it, so this is a plain GET, not an Editor route.

interface ServiceCategory {
  category: number;
  label: string;
  points: number;
}

/** Mirrors the migration-script seed for offline mode. */
const SEED_CATEGORIES: ServiceCategory[] = [
  { category: 1, label: "SEAS / Pools / low", points: 1 },
  { category: 2, label: "Learning / Planning / Assessment", points: 2 },
  { category: 3, label: "Searches / GAC / UGAC / Admissions / Executive / Task forces", points: 3 },
  { category: 4, label: "Directors (DGS/DGA/DUS, Dir. Research, Center Dir.)", points: 5 },
  { category: 5, label: "Associate Chair", points: 8 },
  { category: 6, label: "Chair", points: 15 },
];

/** GET /api/editor/service-categories */
export const GET = withErrorHandler(async () => {
  if (!isDbMode) {
    return ok("Service categories fetched successfully", SEED_CATEGORIES);
  }

  const { getDb } = await import("@/lib/db");
  const rows: ServiceCategory[] = await getDb()
    .select("category", "label", "points")
    .from("cfp_service_categories")
    .orderBy("category", "asc");

  return ok(
    "Service categories fetched successfully",
    rows.map((row) => ({ ...row, points: Number(row.points) }))
  );
});
