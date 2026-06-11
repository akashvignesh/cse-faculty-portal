// Domain model for the faculty portal.
// `Faculty` is the normalized shape produced by facultyMapper — the de-facto
// contract every page and component consumes. Raw API/mock payloads are
// intentionally loose (`RawFacultyRecord`) because the backend has shipped both
// camelCase and snake_case variants; the mapper is the normalization boundary.

export type TermKey = "spring" | "summer" | "fall";

/** Raw, un-normalized record straight from the API or mock data. */
// eslint-disable-next-line
export type RawFacultyRecord = { [key: string]: any };

export interface CoursePreference {
  teachingPreferenceId: string;
  termCode: string;
  courseCode: string;
  preferredCourseName: string;
  priority: string | number;
}

export interface LeaveItem {
  leaveId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  location: string;
  reason: string;
  backupFacultyPersonNumber: string;
}

export interface TeachingReductionItem {
  teachingReductionId: string;
  termCode: string;
  reductionType: string;
  reductionAmount: string | number;
  reason: string;
  approvalDocumentId: string;
  createdAt: string;
}

export interface CommitteeItem {
  committeeId: string;
  committeeName: string;
  role: string;
  termCode: string;
}

export interface AwardItem {
  awardId: string;
  awardName: string;
  awardYear: string;
  organization: string;
}

export interface StudentItem {
  studentId: string;
  studentName: string;
  userid: string;
  program: string;
}

export interface TeachingHistoryItem {
  teachingHistoryId: string;
  year: string;
  term: TermKey;
  classNumber: string;
  courseName: string;
  courseType: string;
  courseCareer: string;
}

export interface TeachingHistoryYearSummary {
  year: string;
  springCount: number;
  summerCount: number;
  fallCount: number;
}

export interface TeachingHistory {
  faculty: string;
  facultySourceKey: string;
  years: TeachingHistoryYearSummary[];
  rows: TeachingHistoryItem[];
}

export interface Faculty {
  name: string;
  userid: string;
  officeAddress: string;
  personNumber: string;
  standardLoad: string;
  nextPromotionDate: string;
  backupFacultyPersonNumber: string;
  profilePhotoDocumentId: string;
  cvDocumentId: string;
  profilePhotoUrl: string;
  titleLine: string;
  statusMessage: string;
  primaryEmail: string;
  secondaryEmail: string;
  physicalAddressLines: string[];
  mailingAddressLines: string[];
  socialLinks: string[];
  pronouns: string;
  primaryAppointment: string;
  researchTopics: string[];
  createdAt: string;
  updatedAt: string;
  leaves: LeaveItem[];
  committees: CommitteeItem[];
  awards: AwardItem[];
  students: StudentItem[];
  coursePreferences: CoursePreference[];
  teachingReductions: TeachingReductionItem[];
  teachingHistory: TeachingHistory;
}

// ── Course preference planner state (matches cfp_faculty_course_plan /
//    cfp_faculty_semester_plan in the database) ─────────────────────────────

/** Mirrors ubs_emp.cfp_faculty_course_plan.faculty_type ENUM. */
export type FacultyType = "Prof Track" | "Lecture 10" | "Lecture 12";

/** Mirrors ubs_emp.cfp_faculty_semester_plan.slot_status ENUM. */
export type SlotStatus = "Teaching" | "Not Teaching";

export interface SemesterSlot {
  id: string;
  status: SlotStatus;
  comment: string;
}

export interface SemesterPlan {
  summer: SemesterSlot[];
  fall: SemesterSlot[];
  spring: SemesterSlot[];
}

export interface RequestedLoad {
  summer: number;
  fall: number;
  spring: number;
}

export interface PlannerCoursePreference {
  id: string;
  courseCode: string;
  courseName: string;
  ranking: number;
}

export interface YearData {
  facultyType: FacultyType;
  roles: string[];
  requestedLoad: RequestedLoad;
  semesterPlan: SemesterPlan;
  coursePreferences: PlannerCoursePreference[];
}

export interface ValidationMessage {
  field?: string;
  type: "error" | "warning";
  message: string;
}
