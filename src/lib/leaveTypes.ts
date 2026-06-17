// Controlled leave-type vocabulary (PDF p4). Shared by the leave editor UI and
// the Editor route validator so the two never drift. These match the planner's
// NOT_TEACHING_COMMENT_OPTIONS leave entries (minus "Deferred", which is a
// teaching-plan comment rather than a leave).
export const LEAVE_TYPES = [
  "Sabbatical – Year (SY)",
  "Sabbatical – Semester (SS)",
  "Leave without Pay (LWOP)",
  "Paid Leave (PL)",
  "Course Buyout",
  "Course Release",
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];
