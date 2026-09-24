// Contract between API route handlers and the two data sources (MySQL via
// knex, or bundled mock data). Field names mirror the Java backend DTOs so
// the wire format stays compatible during the migration.

import type { PaginatedResponse } from "@/types/api";
import type { RawFacultyRecord } from "@/types/faculty";
import type { Role } from "@/lib/permissions";
import type { ProfilePatch } from "@/lib/api/profileSchema";

export interface FacultyListQuery {
  page: number;
  size: number;
  search: string;
}

export interface TeachingHistoryEntry {
  classNumber: string | null;
  courseName: string | null;
  courseType: string | null;
  courseCareer: string | null;
}

export interface TeachingHistoryYear {
  year: number;
  spring: TeachingHistoryEntry[];
  summer: TeachingHistoryEntry[];
  fall: TeachingHistoryEntry[];
}

export interface TeachingHistoryResponse {
  faculty: string | null;
  facultySourceKey: string;
  years: TeachingHistoryYear[];
}

export interface TeachingPreferenceItem {
  courseId: string;
  courseName: string;
  /** 0 = Not Qualified (NQ) … 5 = Most Preferred. */
  pref: number;
  termCode: string | null;
}

export interface TeachingPreferencesResponse {
  facultyId: string;
  teachingPreferences: TeachingPreferenceItem[];
}

export interface SaveTeachingPreferenceItem {
  /** "<catalogNumber>-<courseTitle>", e.g. "521LEC-Operating Systems". */
  courseName: string;
  /** 0..5, or null to delete the stored preference. */
  pref: number | null;
}

export interface SaveTeachingPreferencesRequest {
  facultyId: string;
  /** Optional term anchor (e.g. Fall term code "2259"); threads through writes. */
  termCode?: string | null;
  preferences: SaveTeachingPreferenceItem[];
}

export type SaveAction = "SAVED" | "UPDATED" | "DELETED";

export interface SaveTeachingPreferenceResult {
  courseId: string;
  courseName: string;
  pref: number | null;
  action: SaveAction;
}

export interface SaveTeachingPreferencesResponse {
  facultyId: string;
  totalRequested: number;
  totalProcessed: number;
  processedPreferences: SaveTeachingPreferenceResult[];
}

export interface ActiveCourse {
  subject: string;
  /** "<catalogNumber>-<courseTitle>" — the format the preference UI consumes. */
  courseName: string;
  courseId?: string;
}

export interface CommitteeMembership {
  committeeName: string;
  role: string;
}

export interface ResearchAreaOption {
  researchAreaId: number;
  areaName: string;
}

export interface EditableProfileAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** The editable projection of a faculty profile (contact fields only). */
export interface EditableProfile {
  personalEmail: string;
  phone: string;
  address: EditableProfileAddress;
  researchAreaIds: number[];
  /** The full research-area vocabulary, for the edit-mode checkbox list. */
  researchAreaOptions: ResearchAreaOption[];
}

export interface FacultyDataSource {
  /** Content rows are mapper-friendly raw records (superset of FacultyListItemDto). */
  listFaculty(query: FacultyListQuery): Promise<PaginatedResponse<RawFacultyRecord>>;
  /** Accepts an 8-digit person number or a userid. Null when not found. */
  getFacultyDetail(idOrUserid: string): Promise<RawFacultyRecord | null>;
  /** Faculty photo blob + MIME, or null when the person has no photo. */
  getFacultyPhoto(idOrUserid: string): Promise<{ image: Buffer; mime: string } | null>;
  getTeachingHistory(facultySourceKey: string): Promise<TeachingHistoryResponse | null>;
  getTeachingPreferences(userid: string): Promise<TeachingPreferencesResponse>;
  saveTeachingPreferences(
    userid: string,
    request: SaveTeachingPreferencesRequest
  ): Promise<SaveTeachingPreferencesResponse>;
  getActiveCourses(): Promise<ActiveCourse[]>;
  getCommitteeMemberships(userId: string): Promise<CommitteeMembership[]>;
  /** RBAC role for a userid; null when unknown (session falls back to viewer). */
  getUserRole(userid: string): Promise<Role | null>;
  /** Resolves a userid or 8-digit person number to a person number, if known. */
  resolvePersonNumber(idOrUserid: string): Promise<string | null>;
  /** Editable contact projection for the profile edit form; null when unknown. */
  getFacultyProfile(idOrUserid: string): Promise<EditableProfile | null>;
  /** Persists edited contact fields; `editor` is the acting userid for audit. */
  saveFacultyProfile(
    idOrUserid: string,
    patch: ProfilePatch,
    editor: string
  ): Promise<EditableProfile>;
}
