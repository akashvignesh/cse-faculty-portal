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

// Local mode has no real database, but saves should still round-trip within
// a session so the grid, the read-only detail tab, and the printable report
// all agree on what was actually saved. This in-memory store (keyed by
// canonical userid -> courseName) starts empty per faculty member and is
// mutated by saveTeachingPreferences; it does not survive a server restart.
const teachingPrefsStore = new Map<
  string,
  Map<string, { courseId: string; pref: number; termCode: string | null }>
>();

function canonicalUserid(record: RawFacultyRecord | null, fallback: string): string {
  return String(record?.userid ?? fallback).trim().toLowerCase();
}

export async function getTeachingPreferences(userid: string): Promise<TeachingPreferencesResponse> {
  const record = findRecord(userid);
  const stored = teachingPrefsStore.get(canonicalUserid(record, userid));

  return {
    facultyId: userid,
    teachingPreferences: stored
      ? Array.from(stored.entries()).map(([courseName, entry]) => ({
          courseId: entry.courseId,
          courseName,
          pref: entry.pref,
          termCode: entry.termCode,
        }))
      : [],
  };
}

export async function saveTeachingPreferences(
  userid: string,
  request: SaveTeachingPreferencesRequest
): Promise<SaveTeachingPreferencesResponse> {
  if (!request || !Array.isArray(request.preferences) || request.preferences.length === 0) {
    throw new BadRequestError("preferences list must not be empty");
  }

  const record = findRecord(userid);
  const key = canonicalUserid(record, userid);
  let stored = teachingPrefsStore.get(key);
  if (!stored) {
    stored = new Map();
    teachingPrefsStore.set(key, stored);
  }

  const processed: SaveTeachingPreferenceResult[] = request.preferences.map((item, index) => {
    const courseId = stored!.get(item.courseName)?.courseId ?? `MOCK-${index + 1}`;

    if (item.pref === null) {
      stored!.delete(item.courseName);
      return { courseId, courseName: item.courseName, pref: null, action: "DELETED" };
    }

    const existed = stored!.has(item.courseName);
    stored!.set(item.courseName, {
      courseId,
      pref: item.pref,
      termCode: request.termCode ?? null,
    });
    return {
      courseId,
      courseName: item.courseName,
      pref: item.pref,
      action: existed ? "UPDATED" : "SAVED",
    };
  });

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
