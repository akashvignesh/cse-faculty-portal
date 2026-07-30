import "server-only";
import { committeeList, committeeMembershipData } from "@/data/committeeMockData";
import { courseCatalogMockData } from "@/data/courseCatalogMockData";
import { facultyMockData } from "@/data/facultyMockData";
import { userRoleMockData } from "@/data/userRoleMockData";
import { paginate } from "@/lib/api/response";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import type { Role } from "@/lib/permissions";
import type { ProfilePatch } from "@/lib/api/profileSchema";
import type { EditableProfile } from "@/server/data/types";
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

// No bundled photo blobs offline — the route 404s and the UI shows initials.
export async function getFacultyPhoto(
  _idOrUserid: string
): Promise<{ image: Buffer; mime: string } | null> {
  return null;
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

export async function getUserRole(userid: string): Promise<Role | null> {
  const normalized = userid.trim().toLowerCase();
  if (!normalized) return null;
  const explicit = userRoleMockData[normalized];
  if (explicit) return explicit;
  // Same roster fallback as DB mode: known mock faculty default to "faculty".
  return findRecord(normalized) ? "faculty" : null;
}

export async function resolvePersonNumber(idOrUserid: string): Promise<string | null> {
  const record = findRecord(idOrUserid);
  const personNumber = record?.personNumber;
  return personNumber ? String(personNumber) : null;
}

// A stable research-area vocabulary derived from the mock faculty topics, so
// the edit form's checkbox list works offline. Saves are echoed, not persisted.
const MOCK_RESEARCH_MASTER = (() => {
  const names = new Set<string>();
  for (const record of records) {
    for (const topic of (record.researchTopics ?? []) as string[]) names.add(topic);
  }
  return [...names].sort().map((areaName, index) => ({ researchAreaId: index + 1, areaName }));
})();

export async function getFacultyProfile(idOrUserid: string): Promise<EditableProfile | null> {
  const record = findRecord(idOrUserid);
  if (!record) return null;
  const topics = new Set((record.researchTopics ?? []) as string[]);
  const lines = (record.physicalAddressLines ?? []) as string[];
  return {
    personalEmail: String(record.secondaryEmail ?? ""),
    phone: String(record.phone ?? ""),
    address: {
      line1: lines[0] ?? "",
      line2: lines[1] ?? "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
    researchAreaIds: MOCK_RESEARCH_MASTER.filter((o) => topics.has(o.areaName)).map(
      (o) => o.researchAreaId
    ),
    researchAreaOptions: MOCK_RESEARCH_MASTER,
  };
}

export async function saveFacultyProfile(
  idOrUserid: string,
  patch: ProfilePatch,
  _editor: string
): Promise<EditableProfile> {
  const current = await getFacultyProfile(idOrUserid);
  if (!current) {
    throw new NotFoundError(`No faculty record found for ${idOrUserid}`);
  }
  // Local mode has no persistence — echo the merged result so the UI flow works.
  return {
    ...current,
    personalEmail: patch.personalEmail ?? current.personalEmail,
    phone: patch.phone ?? current.phone,
    address: patch.address ? { ...current.address, ...patch.address } : current.address,
    researchAreaIds: patch.researchAreaIds ?? current.researchAreaIds,
  };
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
