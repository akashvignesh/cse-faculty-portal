import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { Faculty, RawFacultyRecord } from "@/types/faculty";
import { mapFacultyCollection } from "./facultyMapper";

// The browser always talks to this app's own API routes. The local-vs-database
// switch lives server-side (FACULTY_DATA_MODE) — see src/server/data.

const FACULTY_LIST_URL = "/api/v1/faculty?page=0&size=500";

export interface LoadFacultyOptions {
  /** Unused legacy option, kept while the Pages Router callers migrate. */
  config?: unknown;
  fetchImpl?: typeof fetch;
}

export async function loadFacultyRecords({ fetchImpl = fetch }: LoadFacultyOptions = {}): Promise<
  Faculty[]
> {
  const response = await fetchImpl(FACULTY_LIST_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Faculty API request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as ApiResponse<PaginatedResponse<RawFacultyRecord>>;
  if (!payload.success || !payload.data) {
    throw new Error(payload.message || "Faculty API request failed.");
  }

  return mapFacultyCollection(payload.data.content);
}

export function findFacultyByUserid(records: Faculty[], userid: unknown): Faculty | undefined {
  const normalizedUserid = typeof userid === "string" ? userid.trim().toLowerCase() : "";

  return records.find(
    (record) => record.userid && record.userid.toLowerCase() === normalizedUserid
  );
}
