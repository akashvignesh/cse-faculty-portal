import "server-only";
import { committeeList, committeeMembershipData } from "@/data/committeeMockData";
import { courseCatalogMockData } from "@/data/courseCatalogMockData";
import { facultyMockData } from "@/data/facultyMockData";
import { paginate } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import type { PaginatedResponse } from "@/types/api";
import type { RawFacultyRecord } from "@/types/faculty";
import type {
  ActiveCourse,
  CommitteeMembership,
  FacultyListQuery,
  SaveTeachingPreferenceResult,
  SaveTeachingPreferencesRequest,
  SaveTeachingPreferencesResponse,
  TeachingHistoryResponse,
  TeachingPreferencesResponse,
} from "@/server/data/types";

// Offline (FACULTY_DATA_MODE=local) implementation of the data-source contract.
// Serves the bundled mock data through the same HTTP routes the DB mode uses,
// so the frontend has exactly one code path. Writes are accepted but echoed
// back without persistence.

const records = facultyMockData as RawFacultyRecord[];

function findRecord(idOrUserid: string): RawFacultyRecord | null {
  const normalized = idOrUserid.trim().toLowerCase();
  return (
    records.find(
      (record) =>
        String(record.userid ?? "").toLowerCase() === normalized ||
        String(record.personNumber ?? "") === idOrUserid.trim()
    ) ?? null
  );
}

export async function listFaculty(
  query: FacultyListQuery
): Promise<PaginatedResponse<RawFacultyRecord>> {
  const tokens = query.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = tokens.length
    ? records.filter((record) => {
        const name = String(record.name ?? "").toLowerCase();
        return tokens.every((token) => name.includes(token));
      })
    : records;

  const start = query.page * query.size;
  const content = query.size > 0 ? filtered.slice(start, start + query.size) : filtered;
  return paginate(content, query.page, query.size, filtered.length);
}

export async function getFacultyDetail(idOrUserid: string): Promise<RawFacultyRecord | null> {
  return findRecord(idOrUserid);
}

export async function getTeachingHistory(
  facultySourceKey: string
): Promise<TeachingHistoryResponse | null> {
  const record = findRecord(facultySourceKey);
  if (!record) return null;

  // Mock records embed the history in the API envelope shape ({data: {...}}).
  const payload = record.teachingHistory?.data ?? record.teachingHistory ?? null;
  return {
    faculty: payload?.faculty ?? String(record.name ?? ""),
    facultySourceKey: payload?.facultySourceKey ?? String(record.personNumber ?? facultySourceKey),
    years: payload?.years ?? [],
  };
}

const LEGACY_PREF_LABELS: Record<string, number> = {
  "not qualified": 0,
  qualified: 0,
  preference1: 1,
  preference2: 2,
  preference3: 3,
};

function toNumericPref(preference: RawFacultyRecord): number {
  if (typeof preference.priority === "number") return preference.priority;
  const label = String(preference.coursePref ?? "")
    .trim()
    .toLowerCase();
  return LEGACY_PREF_LABELS[label] ?? 0;
}

export async function getTeachingPreferences(userid: string): Promise<TeachingPreferencesResponse> {
  const record = findRecord(userid);
  const preferences = (record?.coursePreferences ?? []) as RawFacultyRecord[];

  return {
    facultyId: userid,
    teachingPreferences: preferences.map((preference, index) => ({
      courseId: String(preference.courseCode ?? preference.courseId ?? `MOCK-${index + 1}`),
      courseName: [preference.courseCode, preference.preferredCourseName ?? preference.courseName]
        .filter(Boolean)
        .join("-"),
      pref: toNumericPref(preference),
      termCode: preference.termCode ? String(preference.termCode) : null,
    })),
  };
}

export async function saveTeachingPreferences(
  userid: string,
  request: SaveTeachingPreferencesRequest
): Promise<SaveTeachingPreferencesResponse> {
  if (!request || !Array.isArray(request.preferences) || request.preferences.length === 0) {
    throw new BadRequestError("preferences list must not be empty");
  }

  // Local mode has no persistence — echo the request as processed so the UI
  // flow can be exercised offline.
  const processed: SaveTeachingPreferenceResult[] = request.preferences.map((item, index) => ({
    courseId: `MOCK-${index + 1}`,
    courseName: item.courseName,
    pref: item.pref,
    action: item.pref === null ? "DELETED" : "SAVED",
  }));

  return {
    facultyId: userid,
    totalRequested: request.preferences.length,
    totalProcessed: processed.length,
    processedPreferences: processed,
  };
}

export async function getActiveCourses(): Promise<ActiveCourse[]> {
  return courseCatalogMockData.map((course) => ({
    subject: course.subject,
    courseName: course.courseName,
  }));
}

export async function getCommitteeMemberships(userId: string): Promise<CommitteeMembership[]> {
  const normalized = userId.trim().toLowerCase();
  return committeeMembershipData
    .filter((membership) => membership.userid.toLowerCase() === normalized)
    .map((membership) => {
      const committee = committeeList.find((item) => item.id === membership.committeeId);
      return {
        committeeName: committee?.name ?? `Committee ${membership.committeeId}`,
        role: membership.role,
      };
    })
    .sort((a, b) => a.committeeName.localeCompare(b.committeeName));
}
