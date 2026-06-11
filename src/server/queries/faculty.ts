import "server-only";
import type { Knex } from "knex";
import { getDb } from "@/lib/db";
import { paginate } from "@/lib/api/response";
import type { PaginatedResponse } from "@/types/api";
import type { RawFacultyRecord } from "@/types/faculty";
import type { FacultyListQuery } from "@/server/data/types";
import { resolvePersonNumber } from "./identity";

// Ports of the Java FacultyRepository / FacultyDetailRepository native queries
// against ubs_emp.cfp_* and the read-only university schemas.

interface OfficeAddressRow {
  faculty_person_number?: string;
  line1: string | null;
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

function formatOfficeAddress(row: OfficeAddressRow | undefined): string | null {
  if (!row) return null;
  const parts = [row.line1, row.city, joinWithSpace(row.state, row.postalCode), row.country]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(", ") : null;
}

function toOfficeAddressDto(row: OfficeAddressRow | undefined) {
  if (!row) return null;
  return {
    line1: row.line1,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
  };
}

/** Latest appointment first: open-ended ones win, then most recent. */
const APPOINTMENT_ORDER =
  "CASE WHEN a.appointment_end_date IS NULL THEN 0 ELSE 1 END ASC, a.appointment_effective_date DESC, a.appointment_id DESC";

async function fetchOfficeAddresses(
  db: Knex,
  personNumbers: string[]
): Promise<Map<string, OfficeAddressRow>> {
  if (personNumbers.length === 0) return new Map();
  const rows = await db
    .select(
      "fa.faculty_person_number",
      "fa.address_line1 as line1",
      "fa.city as city",
      "fa.state_province as state",
      "fa.postal_code as postalCode",
      "fa.country as country"
    )
    .from("cfp_faculty_addresses as fa")
    .where("fa.address_type", "office")
    .whereIn("fa.faculty_person_number", personNumbers)
    .orderBy("fa.faculty_address_id", "asc");

  const byPerson = new Map<string, OfficeAddressRow>();
  for (const row of rows as (OfficeAddressRow & { faculty_person_number: string })[]) {
    if (!byPerson.has(row.faculty_person_number)) {
      byPerson.set(row.faculty_person_number, row);
    }
  }
  return byPerson;
}

export async function listFaculty(
  query: FacultyListQuery
): Promise<PaginatedResponse<RawFacultyRecord>> {
  const db = getDb();
  const tokens = query.search.trim().split(/\s+/).filter(Boolean);

  const base = db("cfp_faculty as f");
  for (const token of tokens) {
    void base.whereRaw("f.full_name LIKE ?", [`%${token}%`]);
  }

  const countRow = await base
    .clone()
    .count<{ total: number | string }[]>({ total: "*" })
    .then((rows) => rows[0]);
  const totalElements = Number(countRow?.total ?? 0);

  const rows: RawFacultyRecord[] = await base
    .clone()
    .select(
      "f.person_number as personNumber",
      "f.full_name as fullName",
      "f.pronouns as pronouns",
      "dpn.principal as userid",
      db
        .select("a.official_job_title")
        .from("cfp_appointments as a")
        .whereRaw("a.faculty_person_number = f.person_number")
        .orderByRaw(APPOINTMENT_ORDER)
        .limit(1)
        .as("title"),
      db
        .select("fe.email_address")
        .from("cfp_faculty_emails as fe")
        .whereRaw("fe.faculty_person_number = f.person_number")
        .where("fe.email_type", "work")
        .where("fe.is_primary", 1)
        .orderBy("fe.faculty_email_id", "asc")
        .limit(1)
        .as("primaryEmail")
    )
    .joinRaw(
      "LEFT JOIN dce.person_number dpn ON CONVERT(dpn.person_number USING utf8mb4) = CONVERT(f.person_number USING utf8mb4)"
    )
    .orderBy([
      { column: "f.full_name", order: "asc" },
      { column: "f.person_number", order: "asc" },
    ])
    .limit(query.size)
    .offset(query.page * query.size);

  const addresses = await fetchOfficeAddresses(
    db,
    rows.map((row) => String(row.personNumber))
  );

  const content = rows.map((row) => ({
    ...row,
    officeAddress: formatOfficeAddress(addresses.get(String(row.personNumber))),
  }));

  return paginate(content, query.page, query.size, totalElements);
}

export async function getFacultyDetail(idOrUserid: string): Promise<RawFacultyRecord | null> {
  const db = getDb();
  const personNumber = await resolvePersonNumber(idOrUserid);
  if (!personNumber) return null;

  const faculty = await db
    .select(
      "f.person_number as personNumber",
      "f.full_name as fullName",
      "f.pronouns as pronouns",
      "f.standard_load as standardLoad",
      "f.next_promotion_date as nextPromotionDate",
      "f.backup_faculty_person_number as backupFacultyPersonNumber",
      "f.profile_photo_document_id as profilePhotoDocumentId",
      "f.cv_document_id as cvDocumentId"
    )
    .from("cfp_faculty as f")
    .where("f.person_number", personNumber)
    .first<RawFacultyRecord | undefined>();

  if (!faculty) return null;

  const [userid, appointment, email, phone, address, researchAreas, reductions, leaves, students] =
    await Promise.all([
      db
        .select("principal")
        .from("dce.person_number")
        .whereRaw("CONVERT(person_number USING utf8mb4) = CONVERT(? USING utf8mb4)", [
          personNumber,
        ])
        .first<{ principal: string } | undefined>(),
      db
        .select("a.official_job_title as title", "a.appointment_type as rankName")
        .from("cfp_appointments as a")
        .where("a.faculty_person_number", personNumber)
        .orderByRaw(APPOINTMENT_ORDER)
        .first<{ title: string | null; rankName: string | null } | undefined>(),
      db
        .select("fe.email_address as emailAddress")
        .from("cfp_faculty_emails as fe")
        .where("fe.faculty_person_number", personNumber)
        .where("fe.email_type", "work")
        .where("fe.is_primary", 1)
        .orderBy("fe.faculty_email_id", "asc")
        .first<{ emailAddress: string } | undefined>(),
      db
        .select("fp.phone_number as phoneNumber")
        .from("cfp_faculty_phone_numbers as fp")
        .where("fp.faculty_person_number", personNumber)
        .where("fp.phone_type", "office")
        .where("fp.is_primary", 1)
        .orderBy("fp.faculty_phone_id", "asc")
        .first<{ phoneNumber: string } | undefined>(),
      db
        .select(
          "fa.address_line1 as line1",
          "fa.city as city",
          "fa.state_province as state",
          "fa.postal_code as postalCode",
          "fa.country as country"
        )
        .from("cfp_faculty_addresses as fa")
        .where("fa.faculty_person_number", personNumber)
        .where("fa.address_type", "office")
        .orderBy("fa.faculty_address_id", "asc")
        .first<OfficeAddressRow | undefined>(),
      db
        .select("ram.area_name as areaName")
        .from("cfp_faculty_research_areas as fra")
        .join("cfp_research_area_master as ram", "ram.research_area_id", "fra.research_area_id")
        .where("fra.faculty_person_number", personNumber)
        .orderBy("fra.faculty_research_area_id", "asc"),
      db
        .select(
          "tr.term_code as termCode",
          "tr.reduction_type as reductionType",
          "tr.reduction_amount as reductionAmount",
          "tr.reason as reason",
          "tr.approval_document_id as approvalDocumentId",
          "tr.created_at as createdAt"
        )
        .from("cfp_teaching_reductions as tr")
        .where("tr.faculty_person_number", personNumber)
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
          "fl.backup_faculty_person_number as backupFacultyPersonNumber"
        )
        .from("cfp_faculty_leave as fl")
        .where("fl.faculty_person_number", personNumber)
        .orderBy([
          { column: "fl.start_date", order: "desc" },
          { column: "fl.leave_id", order: "desc" },
        ]),
      db
        .select(
          "s.person_number as studentPersonNumber",
          "s.full_name as fullName",
          "s.program as program"
        )
        .from("cfp_students as s")
        .where("s.advisor_faculty_person_number", personNumber)
        .orderBy([
          { column: "s.full_name", order: "asc" },
          { column: "s.person_number", order: "asc" },
        ]),
    ]);

  return {
    ...faculty,
    userid: userid?.principal?.trim() ?? null,
    title: appointment?.title ?? null,
    rank: appointment?.rankName ?? null,
    profilePhotoUrl: faculty.profilePhotoDocumentId
      ? `/api/v1/faculty/${personNumber}/profile-photo`
      : null,
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
