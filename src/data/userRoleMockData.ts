import type { Role } from "@/lib/permissions";

// Mock-mode (FACULTY_DATA_MODE=local) equivalent of ubs_emp.cfp_user_role.
// Userids not listed here fall back to "faculty" when they appear in
// facultyMockData (the mock roster) and "viewer" otherwise — the same
// resolution the DB mode applies.
export const userRoleMockData: Record<string, Role> = {
  jsmith: "chair",
  abrown: "staff",
  rlee: "faculty",
  guest: "viewer",
};
