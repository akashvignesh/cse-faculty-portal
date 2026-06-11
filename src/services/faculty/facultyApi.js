import { mapFacultyCollection } from "./facultyMapper";

export async function fetchFacultyFromApi({ apiUrl, fetchImpl = fetch }) {
  if (!apiUrl) {
    throw new Error(
      "Dev mode requires NEXT_PUBLIC_FACULTY_API_URL to point to the faculty API."
    );
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
