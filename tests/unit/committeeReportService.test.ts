import { describe, expect, it } from "vitest";
import type { MatrixColumn } from "@/services/committee/committeeMatrixService";
import {
  bucketForCell,
  buildByCommitteeReport,
  buildByNameReport,
} from "@/services/committee/committeeReportService";
import type { Faculty } from "@/types/faculty";

function makeFaculty(userid: string, name: string): Faculty {
  return {
    name,
    userid,
    officeAddress: "",
    campusOffice: "",
    personNumber: "",
    standardLoad: "",
    nextPromotionDate: "",
    backupFacultyPersonNumber: "",
    profilePhotoDocumentId: "",
    cvDocumentId: "",
    profilePhotoUrl: "",
    titleLine: "",
    statusMessage: "",
    primaryEmail: `${userid}@buffalo.edu`,
    secondaryEmail: "",
    phone: "",
    physicalAddressLines: [],
    mailingAddressLines: [],
    socialLinks: [],
    pronouns: "",
    primaryAppointment: "",
    researchTopics: [],
    createdAt: "",
    updatedAt: "",
    leaves: [],
    committees: [],
    awards: [],
    students: [],
    coursePreferences: [],
    teachingReductions: [],
    teachingHistory: {} as Faculty["teachingHistory"],
  };
}

function makeColumn(
  id: number,
  name: string,
  type: "role" | "committee"
): MatrixColumn {
  return { id, name, type, category: null, servicePoints: null };
}

const chairRole = makeColumn(1, "Associate Chair", "role");
const gradAdmissions = makeColumn(10, "Grad Admissions", "committee");
const colloquium = makeColumn(12, "Colloquium Upbeat", "committee");

describe("bucketForCell", () => {
  it("maps role-column X to chair", () => {
    expect(bucketForCell(chairRole, "X")).toBe("chair");
  });

  it("ignores blank role-column cells", () => {
    expect(bucketForCell(chairRole, "")).toBeNull();
  });

  it("maps committee codes C and R to chair", () => {
    expect(bucketForCell(gradAdmissions, "C")).toBe("chair");
    expect(bucketForCell(gradAdmissions, "R")).toBe("chair");
  });

  it("maps committee code V to viceChair", () => {
    expect(bucketForCell(gradAdmissions, "V")).toBe("viceChair");
  });

  it("maps committee code M to member", () => {
    expect(bucketForCell(gradAdmissions, "M")).toBe("member");
  });

  it("ignores blank committee cells", () => {
    expect(bucketForCell(gradAdmissions, "")).toBeNull();
  });
});

describe("buildByNameReport", () => {
  const records = [makeFaculty("roshana", "Roshan Ayyalasomayajula"), makeFaculty("jsmith", "John Smith")];
  const columns = [chairRole, gradAdmissions, colloquium];
  const memberships = {
    "roshana-1": "X",
    "roshana-10": "C",
    "roshana-12": "M",
    "jsmith-10": "V",
  };

  const rows = buildByNameReport(records, columns, memberships);

  it("produces one row per faculty member, in order", () => {
    expect(rows.map((r) => r.userid)).toEqual(["roshana", "jsmith"]);
  });

  it("groups a person's assignments by bucket, using column names", () => {
    const roshan = rows.find((r) => r.userid === "roshana")!;
    expect(roshan.chair).toEqual(["Associate Chair", "Grad Admissions"]);
    expect(roshan.viceChair).toEqual([]);
    expect(roshan.member).toEqual(["Colloquium Upbeat"]);
    expect(roshan.email).toBe("roshana@buffalo.edu");
  });

  it("leaves buckets empty for a person with no matching assignment", () => {
    const jsmith = rows.find((r) => r.userid === "jsmith")!;
    expect(jsmith.chair).toEqual([]);
    expect(jsmith.viceChair).toEqual(["Grad Admissions"]);
    expect(jsmith.member).toEqual([]);
  });
});

describe("buildByCommitteeReport", () => {
  const records = [makeFaculty("roshana", "Roshan Ayyalasomayajula"), makeFaculty("jsmith", "John Smith")];
  const columns = [chairRole, gradAdmissions];
  const memberships = {
    "roshana-1": "X",
    "roshana-10": "C",
    "jsmith-10": "M",
  };

  const rows = buildByCommitteeReport(records, columns, memberships);

  it("produces one row per column, in order", () => {
    expect(rows.map((r) => r.committeeName)).toEqual(["Associate Chair", "Grad Admissions"]);
  });

  it("groups multiple people assigned to the same committee under the right bucket", () => {
    const gradAdmissionsRow = rows.find((r) => r.committeeName === "Grad Admissions")!;
    expect(gradAdmissionsRow.chairs).toEqual(["Roshan Ayyalasomayajula"]);
    expect(gradAdmissionsRow.members).toEqual(["John Smith"]);
    expect(gradAdmissionsRow.viceChairs).toEqual([]);
  });

  it("lists the sole holder of a leadership role under chairs", () => {
    const roleRow = rows.find((r) => r.committeeName === "Associate Chair")!;
    expect(roleRow.chairs).toEqual(["Roshan Ayyalasomayajula"]);
  });
});
