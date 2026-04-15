import { FACULTY_DATA_MODES } from "../../config/appConfig";
import { facultyMockData } from "../../data/facultyMockData";
import { fetchFacultyFromApi } from "./facultyApi";
import { mapFacultyCollection } from "./facultyMapper";

export async function loadFacultyRecords({ config, fetchImpl = fetch }) {
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

export function findFacultyByUserid(records, userid) {
  const normalizedUserid = typeof userid === "string" ? userid.trim().toLowerCase() : "";

  return records.find(
    (record) => record.userid && record.userid.toLowerCase() === normalizedUserid
  );
}
