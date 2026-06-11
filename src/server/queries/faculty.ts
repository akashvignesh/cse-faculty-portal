import "server-only";
import { getDb } from "@/lib/db";
import { paginate } from "@/lib/api/response";
import type { PaginatedResponse } from "@/types/api";
import type { RawFacultyRecord } from "@/types/faculty";
import type { FacultyListQuery } from "@/server/data/types";
import { resolvePersonNumber } from "./identity";

// Queries against the live schema (verified 2026-06 via information_schema +
// the department ER model):
//   - ubs_emp.cfp_faculty is a key table (person_number, cv_document_id only)
//   - names come from ps_rpt.ub_display_name_v (emplid = person_number)
//   - ubs_emp.cfp_appointments is ONE row per person (PK person_number) and
//     carries title/rank/standard_course_load/next_promotion_date
//   - contact info lives in cfp_faculty_primary_{email,phone_number,address}
//     (PK person_number, single row each)
//   - PhD students come from people.phd_advisors (advisor = faculty userid)
// Cross-schema joins CONVERT both sides to utf8mb4 — legacy schemas are latin1.

/** dce.person_number can hold several principals per person; pick one deterministically. */
const DPN_JOIN = `
  LEFT JOIN (
    SELECT person_number, MIN(principal) AS principal
    FROM dce.person_number
    GROUP BY person_number
  ) dpn ON CONVERT(dpn.person_number USING utf8mb4) = CONVERT(f.person_number USING utf8mb4)`;

const NAME_JOIN = `
  LEFT JOIN ps_rpt.ub_display_name_v n
    ON CONVERT(n.emplid USING utf8mb4) = CONVERT(f.person_number USING utf8mb4)`;

interface AddressRow {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

function joinWithSpace(left: string | null, right: string | null): string | null {
  const l = left?.trim() || null;
  const r = right?.trim() || null;
  if (l && r) return `${l} ${r}`;
  return l ?? r;
}

function formatOfficeAddress(row: Partial<AddressRow> | undefined): string | null {
  if (!row) return null;
  const parts = [
    row.line1,
    row.line2,
    row.city,
    joinWithSpace(row.state ?? null, row.postalCode ?? null),
    row.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(", ") : null;
}

function toOfficeAddressDto(row: Partial<AddressRow> | undefined) {
  if (!row || !row.line1) return null;
  return {
    line1: row.line1,
    line2: row.line2 ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    postalCode: row.postalCode ?? null,
    country: row.country ?? null,
  };
}

export async function listFaculty(
  query: FacultyListQuery
): Promise<PaginatedResponse<RawFacultyRecord>> {
  const db = getDb();
  const tokens = query.search.trim().split(/\s+/).filter(Boolean);

  const base = db("cfp_faculty as f").joinRaw(NAME_JOIN);
  for (const token of tokens) {
    void base.whereRaw("COALESCE(n.name_display, f.person_number) LIKE ?", [`%${token}%`]);
  }

  const countRow = await base
    .clone()
    .count<{ total: number | string }[]>({ total: "*" })
    .then((rows) => rows[0]);
  const totalElements = Number(countRow?.total ?? 0);

  const rows: (RawFacultyRecord & Partial<AddressRow>)[] = await base
    .clone()
    .joinRaw(DPN_JOIN)
    .leftJoin("cfp_appointments as app", "app.person_number", "f.person_number")
    .leftJoin("cfp_faculty_primary_email as pe", "pe.person_number", "f.person_number")
    .leftJoin("cfp_faculty_primary_address as pa", "pa.person_number", "f.person_number")
    .select(
      "f.person_number as personNumber",
      db.raw("COALESCE(n.name_display, f.person_number) as fullName"),
      "dpn.principal as userid",
      db.raw("COALESCE(app.in_house_title, app.official_job_title) as title"),
      "app.appointment_type as rank",
      "app.standard_course_load as standardLoad",
      "pe.email_address as primaryEmail",
      "pa.address_line1 as line1",
      "pa.address_line2 as line2",
      "pa.city as city",
      "pa.state_province as state",
      "pa.postal_code as postalCode",
      "pa.country as country"
    )
    .orderByRaw("n.name_display IS NULL, n.name_display ASC, f.person_number ASC")
    .limit(query.size)
    .offset(query.page * query.size);

  const content = rows.map(({ line1, line2, city, state, postalCode, country, ...row }) => ({
    ...row,
    officeAddress: formatOfficeAddress({ line1, line2, city, state, postalCode, country }),
  }));

  return paginate(content, query.page, query.size, totalElements);
}

interface StudentRow {
  studentPersonNumber: string | null;
  fullName: string | null;
  userid: string;
}

async function fetchStudents(facultyUserid: string | null): Promise<RawFacultyRecord[]> {
  if (!facultyUserid) return [];
  const db = getDb();

  const rows = await db.raw<[StudentRow[], unknown]>(
    `
    SELECT pa.userid AS userid,
           dpn.person_number AS studentPersonNumber,
           n.name_display AS fullName
    FROM people.phd_advisors pa
    LEFT JOIN (
        SELECT principal, MIN(person_number) AS person_number
        FROM dce.person_number
        GROUP BY principal
    ) dpn ON CONVERT(dpn.principal USING utf8mb4) = CONVERT(pa.userid USING utf8mb4)
    LEFT JOIN ps_rpt.ub_display_name_v n
      ON CONVERT(n.emplid USING utf8mb4) = CONVERT(dpn.person_number USING utf8mb4)
    WHERE CONVERT(pa.advisor USING utf8mb4) = CONVERT(? USING utf8mb4)
      AND pa.active = 1
    ORDER BY n.name_display ASC, pa.userid ASC
    `,
    [facultyUserid]
  );

  return (rows[0] ?? []).map((row: StudentRow) => ({
    studentPersonNumber: row.studentPersonNumber ?? row.userid,
    fullName: row.fullName ?? row.userid,
    userid: row.userid,
    program: "PhD",
  }));
}

export async function getFacultyDetail(idOrUserid: string): Promise<RawFacultyRecord | null> {
  const db = getDb();
  const personNumber = await resolvePersonNumber(idOrUserid);
  if (!personNumber) return null;

  const faculty = await db
    .select("f.person_number as personNumber", "f.cv_document_id as cvDocumentId")
    .from("cfp_faculty as f")
    .where("f.person_number", personNumber)
    .first<RawFacultyRecord | undefined>();

  if (!faculty) return null;

  const [name, userid, appointment, email, phone, address, researchAreas, reductions, leaves] =
    await Promise.all([
      db
        .select("n.name_display as nameDisplay")
        .fromRaw("ps_rpt.ub_display_name_v as n")
        .whereRaw("CONVERT(n.emplid USING utf8mb4) = CONVERT(? USING utf8mb4)", [personNumber])
        .first<{ nameDisplay: string } | undefined>(),
      db
        .select("principal")
        .from("dce.person_number")
        .whereRaw("CONVERT(person_number USING utf8mb4) = CONVERT(? USING utf8mb4)", [
          personNumber,
        ])
        .orderBy("principal", "asc")
        .first<{ principal: string } | undefined>(),
      db
        .select(
          "a.official_job_title as title",
          "a.appointment_type as rankName",
          "a.in_house_title as inHouseTitle",
          "a.standard_course_load as standardLoad",
          "a.next_promotion_date as nextPromotionDate"
        )
        .from("cfp_appointments as a")
        .where("a.person_number", personNumber)
        .first<
          | {
              title: string | null;
              rankName: string | null;
              inHouseTitle: string | null;
              standardLoad: string | null;
              nextPromotionDate: string | null;
            }
          | undefined
        >(),
      db
        .select("pe.email_address as emailAddress")
        .from("cfp_faculty_primary_email as pe")
        .where("pe.person_number", personNumber)
        .first<{ emailAddress: string } | undefined>(),
      db
        .select("pp.phone_number as phoneNumber")
        .from("cfp_faculty_primary_phone_number as pp")
        .where("pp.person_number", personNumber)
        .first<{ phoneNumber: string } | undefined>(),
      db
        .select(
          "pa.address_line1 as line1",
          "pa.address_line2 as line2",
          "pa.city as city",
          "pa.state_province as state",
          "pa.postal_code as postalCode",
          "pa.country as country"
        )
        .from("cfp_faculty_primary_address as pa")
        .where("pa.person_number", personNumber)
        .first<AddressRow | undefined>(),
      db
        .select("ram.area_name as areaName")
        .from("cfp_faculty_research_areas as fra")
        .join("cfp_research_area_master as ram", "ram.research_area_id", "fra.research_area_id")
        .where("fra.person_number", personNumber)
        .orderBy("fra.faculty_research_area_id", "asc"),
      db
        .select(
          "tr.term_code as termCode",
          "tr.reduction_type as reductionType",
          "tr.reduction_load as reductionAmount",
          "tr.reason as reason",
          "tr.approval_document_id as approvalDocumentId",
          "tr.dt as createdAt"
        )
        .from("cfp_teaching_reductions as tr")
        .where("tr.person_number", personNumber)
        .orderBy([
          { column: "tr.term_code", order: "desc" },
          { column: "tr.teaching_reduction_id", order: "desc" },
        ]),
      db
        .select(
          "fl.leave_type as leaveType",
          "fl.start_date as startDate",
          "fl.end_date as endDate",
          "fl.location as location",
          "fl.reason as reason",
          "fl.backup_person_number as backupFacultyPersonNumber"
        )
        .from("cfp_faculty_leave as fl")
        .where("fl.person_number", personNumber)
        .orderBy([
          { column: "fl.start_date", order: "desc" },
          { column: "fl.leave_id", order: "desc" },
        ]),
    ]);

  const facultyUserid = userid?.principal?.trim() ?? null;
  const students = await fetchStudents(facultyUserid);

  return {
    ...faculty,
    fullName: name?.nameDisplay ?? String(faculty.personNumber),
    userid: facultyUserid,
    pronouns: null,
    title: appointment?.title ?? null,
    rank: appointment?.rankName ?? null,
    titleLine: appointment?.inHouseTitle ?? appointment?.title ?? null,
    standardLoad: appointment?.standardLoad ?? null,
    nextPromotionDate: appointment?.nextPromotionDate ?? null,
    profilePhotoUrl: null,
    contact: {
      email: email?.emailAddress ?? null,
      phone: phone?.phoneNumber ?? null,
      officeAddress: toOfficeAddressDto(address),
    },
    officeAddress: formatOfficeAddress(address),
    researchAreas: (researchAreas as { areaName: string }[]).map((row) => row.areaName),
    teachingReductions: reductions,
    leaveSummary: leaves,
    studentsUnderProfessor: students,
  };
}
