import { FACULTY_DATA_MODES, type AppConfig } from "../../config/appConfig";
import { facultyMockData } from "../../data/facultyMockData";
import type { Faculty } from "../../types/faculty";
import { fetchFacultyFromApi } from "./facultyApi";
import { mapFacultyCollection } from "./facultyMapper";

export interface LoadFacultyOptions {
  config: AppConfig;
  fetchImpl?: typeof fetch;
}

export async function loadFacultyRecords({
  config,
  fetchImpl = fetch,
}: LoadFacultyOptions): Promise<Faculty[]> {
  switch (config.facultyDataMode) {
    case FACULTY_DATA_MODES.LOCAL:
      return mapFacultyCollection(facultyMockData);

    case FACULTY_DATA_MODES.DEV:
      return fetchFacultyFromApi({
        apiUrl: config.facultyApiUrl,
        fetchImpl,
      });

    default:
      throw new Error(`Unsupported faculty data mode: ${config.facultyDataMode}`);
  }
}

export function findFacultyByUserid(records: Faculty[], userid: unknown): Faculty | undefined {
  const normalizedUserid = typeof userid === "string" ? userid.trim().toLowerCase() : "";

  return records.find(
    (record) => record.userid && record.userid.toLowerCase() === normalizedUserid
  );
}
