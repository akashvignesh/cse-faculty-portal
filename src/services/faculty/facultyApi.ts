import type { Faculty } from "../../types/faculty";
import { mapFacultyCollection } from "./facultyMapper";

export interface FetchFacultyOptions {
  apiUrl: string;
  fetchImpl?: typeof fetch;
}

export async function fetchFacultyFromApi({
  apiUrl,
  fetchImpl = fetch,
}: FetchFacultyOptions): Promise<Faculty[]> {
  if (!apiUrl) {
    throw new Error("Dev mode requires NEXT_PUBLIC_FACULTY_API_URL to point to the faculty API.");
  }

  const response = await fetchImpl(apiUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Faculty API request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  return mapFacultyCollection(payload);
}
