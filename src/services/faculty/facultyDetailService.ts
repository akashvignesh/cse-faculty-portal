// Typed client fetchers for the faculty detail view. The detail record comes
// from one endpoint; teaching history, committee memberships, and course
// preferences are fetched lazily when their tabs open (the DB-mode detail
// endpoint does not embed them).

import type { ApiResponse } from "@/types/api";
import type {
  CommitteeItem,
  CoursePreference,
  Faculty,
  RawFacultyRecord,
  TeachingHistory,
} from "@/types/faculty";
import { mapFacultyRecord, mapTeachingHistoryData } from "./facultyMapper";

async function getJson<T>(url: string, fetchImpl: typeof fetch = fetch): Promise<T> {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || `Request failed with status ${response.status}.`);
  }
  return payload.data as T;
}

export async function fetchFacultyDetail(idOrUserid: string): Promise<Faculty> {
  const record = await getJson<RawFacultyRecord>(
    `/api/v1/faculty/${encodeURIComponent(idOrUserid)}`
  );
  return mapFacultyRecord(record, 0);
}

export async function fetchTeachingHistory(idOrUserid: string): Promise<TeachingHistory> {
  const data = await getJson<RawFacultyRecord>(
    `/api/v1/faculty/${encodeURIComponent(idOrUserid)}/teaching-history`
  );
  return mapTeachingHistoryData(data ?? {});
}

export async function fetchCommitteeMemberships(userid: string): Promise<CommitteeItem[]> {
  const data = await getJson<{ committeeName: string; role: string }[]>(
    `/api/v1/committees/memberships?userId=${encodeURIComponent(userid)}`
  );
  return (data ?? []).map((membership, index) => ({
    committeeId: `C-${index + 1}`,
    committeeName: membership.committeeName ?? "",
    role: membership.role ?? "",
    termCode: "",
  }));
}

export async function fetchCoursePreferences(idOrUserid: string): Promise<CoursePreference[]> {
  const data = await getJson<{
    teachingPreferences?: {
      courseId: string;
      courseName: string;
      pref: number | string;
      termCode: string | null;
    }[];
  }>(`/api/v1/faculty/${encodeURIComponent(idOrUserid)}/teaching-preferences`);

  return (data?.teachingPreferences ?? []).map((preference, index) => {
    const courseName = preference.courseName ?? "";
    const separatorIndex = courseName.indexOf("-");
    return {
      teachingPreferenceId: preference.courseId || String(index + 1),
      termCode: preference.termCode ?? "",
      courseCode: separatorIndex > 0 ? courseName.slice(0, separatorIndex) : preference.courseId,
      preferredCourseName: separatorIndex > 0 ? courseName.slice(separatorIndex + 1) : courseName,
      priority: preference.pref,
    };
  });
}
