import { describe, expect, it } from "vitest";
import { mapFacultyCollection, mapFacultyRecord } from "@/services/faculty/facultyMapper";

const minimalRecord = {
  name: "Jane Smith",
  userid: "jsmith",
  officeAddress: "338 Davis Hall",
};

describe("mapFacultyRecord", () => {
  it("maps a minimal camelCase record", () => {
    const result = mapFacultyRecord(minimalRecord, 0);

    expect(result.name).toBe("Jane Smith");
    expect(result.userid).toBe("jsmith");
    expect(result.officeAddress).toBe("338 Davis Hall");
    expect(result.leaves).toEqual([]);
    expect(result.committees).toEqual([]);
    expect(result.teachingHistory.rows).toEqual([]);
  });

  it("maps snake_case fields to the camelCase domain model", () => {
    const result = mapFacultyRecord(
      {
        full_name: undefined,
        name: "Alan Brown",
        user_id: "abrown",
        office_address: "201 Capen Hall",
        person_number: "12345678",
        standard_load: "6",
        next_promotion_date: "2027-09-01",
        primary_email: "abrown@buffalo.edu",
        research_topics: ["Systems", " Networks "],
      },
      0
    );

    expect(result.userid).toBe("abrown");
    expect(result.personNumber).toBe("12345678");
    expect(result.standardLoad).toBe("6");
    expect(result.nextPromotionDate).toBe("2027-09-01");
    expect(result.primaryEmail).toBe("abrown@buffalo.edu");
    expect(result.researchTopics).toEqual(["Systems", "Networks"]);
  });

  it("derives userid from the primary email when missing", () => {
    const result = mapFacultyRecord(
      {
        name: "Rita Lee",
        primaryEmail: "rlee@buffalo.edu",
        officeAddress: "101 Davis Hall",
      },
      0
    );

    expect(result.userid).toBe("rlee");
  });

  it("formats a structured contact office address", () => {
    const result = mapFacultyRecord(
      {
        name: "Rita Lee",
        userid: "rlee",
        contact: {
          officeAddress: {
            line1: "101 Davis Hall",
            city: "Buffalo",
            state: "NY",
            postalCode: "14260",
          },
        },
      },
      0
    );

    expect(result.officeAddress).toBe("101 Davis Hall, Buffalo NY 14260");
    expect(result.physicalAddressLines).toEqual(["101 Davis Hall", "Buffalo, NY, 14260"]);
  });

  it("flattens nested teaching history years into rows", () => {
    const result = mapFacultyRecord(
      {
        ...minimalRecord,
        teachingHistory: {
          data: {
            faculty: "Jane Smith",
            facultySourceKey: "12345678",
            years: [
              {
                year: 2024,
                spring: [{ classNumber: "CSE 331", courseName: "Algorithms" }],
                summer: [],
                fall: [
                  { classNumber: "CSE 521", courseName: "Operating Systems" },
                  { classNumber: "CSE 486", courseName: "Distributed Systems" },
                ],
              },
            ],
          },
        },
      },
      0
    );

    expect(result.teachingHistory.facultySourceKey).toBe("12345678");
    expect(result.teachingHistory.years).toEqual([
      { year: "2024", springCount: 1, summerCount: 0, fallCount: 2 },
    ]);
    expect(result.teachingHistory.rows).toHaveLength(3);
    expect(result.teachingHistory.rows[0]).toMatchObject({
      term: "spring",
      classNumber: "CSE 331",
      courseName: "Algorithms",
    });
  });

  it("throws when no routable identifier is present", () => {
    expect(() => mapFacultyRecord({ name: "No Ids" }, 3)).toThrow(
      /index 3.*name plus userid or personNumber/
    );
  });

  it("accepts records without an office address (DB mode)", () => {
    const result = mapFacultyRecord({ name: "No Office", userid: "nooffice" }, 0);
    expect(result.officeAddress).toBe("");
  });
});

describe("mapFacultyCollection", () => {
  it("accepts a bare array", () => {
    expect(mapFacultyCollection([minimalRecord])).toHaveLength(1);
  });

  it("accepts { data: [...] } payloads", () => {
    expect(mapFacultyCollection({ data: [minimalRecord] })).toHaveLength(1);
  });

  it("accepts a single { data: {...} } object payload", () => {
    expect(mapFacultyCollection({ data: minimalRecord })).toHaveLength(1);
  });

  it("accepts { faculty: [...] } payloads", () => {
    expect(mapFacultyCollection({ faculty: [minimalRecord] })).toHaveLength(1);
  });

  it("rejects unrecognized payload shapes", () => {
    expect(() => mapFacultyCollection({ rows: [minimalRecord] })).toThrow(
      /must be an array or expose a data\/faculty array/
    );
  });
});
