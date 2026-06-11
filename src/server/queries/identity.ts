import "server-only";
import { getDb } from "@/lib/db";

// dce.person_number is the identity bridge between the two key spaces:
// course plans / cfp_faculty key on person_number, while committee
// assignments and teaching preferences key on userid (dce "principal").

const PERSON_NUMBER_PATTERN = /^\d{8}$/;

export function looksLikePersonNumber(value: string): boolean {
  return PERSON_NUMBER_PATTERN.test(value.trim());
}

export async function useridForPersonNumber(personNumber: string): Promise<string | null> {
  // (person_number, principal) is a composite PK — a person can map to
  // several principals; pick deterministically.
  const row = await getDb()
    .select("principal")
    .from("dce.person_number")
    .where("person_number", personNumber)
    .orderBy("principal", "asc")
    .first<{ principal: string } | undefined>();
  return row?.principal?.trim() || null;
}

export async function personNumberForUserid(userid: string): Promise<string | null> {
  const row = await getDb()
    .select("person_number")
    .from("dce.person_number")
    .where("principal", userid)
    .orderBy("person_number", "asc")
    .first<{ person_number: string } | undefined>();
  return row?.person_number?.trim() || null;
}

/** Resolves a route id (userid or 8-digit person number) to a person number. */
export async function resolvePersonNumber(idOrUserid: string): Promise<string | null> {
  const normalized = idOrUserid.trim();
  if (looksLikePersonNumber(normalized)) {
    return normalized;
  }
  return personNumberForUserid(normalized);
}

/** Resolves a route id (userid or 8-digit person number) to a userid. */
export async function resolveUserid(idOrUserid: string): Promise<string | null> {
  const normalized = idOrUserid.trim();
  if (!looksLikePersonNumber(normalized)) {
    return normalized || null;
  }
  return useridForPersonNumber(normalized);
}
