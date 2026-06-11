import "server-only";
import { getDb } from "@/lib/db";
import type { CommitteeMembership } from "@/server/data/types";

/** Legacy committee memberships (read-only committees.* schema). */
export async function getCommitteeMemberships(userId: string): Promise<CommitteeMembership[]> {
  const db = getDb();
  const rows = await db
    .select("c.name as committeeName", "m.role as role")
    .from("committees.committees as c")
    .join("committees.members as m", "m.committee_id", "c.id")
    .where("m.userid", userId)
    .orderBy("c.name", "asc");
  return rows as CommitteeMembership[];
}
