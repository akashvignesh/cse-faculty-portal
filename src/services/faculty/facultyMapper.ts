// Normalization boundary between raw API/mock payloads and the typed `Faculty`
// domain model. Raw records arrive in both camelCase and snake_case variants,
// so every accessor tolerates either spelling.

import type {
  AwardItem,
  CommitteeItem,
  CoursePreference,
  Faculty,
  LeaveItem,
  RawFacultyRecord,
  StudentItem,
  TeachingHistory,
  TeachingHistoryItem,
  TeachingReductionItem,
  TermKey,
} from "../../types/faculty";

function normalizeField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(value: unknown): RawFacultyRecord[] {
  return Array.isArray(value) ? value : [];
}

function normalizeStringArray(value: unknown): string[] {
  return (Array.isArray(value) ? value : []).map(normalizeField).filter(Boolean);
}

interface RawOfficeAddress {
  line1?: unknown;
  line2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  country?: unknown;
}

function formatOfficeAddress(address: RawOfficeAddress | string | null | undefined): string {
  if (!address || typeof address === "string") {
    return normalizeField(address);
  }

  return normalizeStringArray([
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(" "),
    address.country,
  ]).join(", ");
}

function formatOfficeAddressLines(address: RawOfficeAddress | string | null | undefined): string[] {
  if (!address || typeof address === "string") {
    const normalizedAddress = normalizeField(address);
    return normalizedAddress ? [normalizedAddress] : [];
  }

  return normalizeStringArray([
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ]);
}

function deriveUserid(record: RawFacultyRecord): string {
  const explicitUserid = normalizeField(record?.userid ?? record?.userId ?? record?.user_id);

  if (explicitUserid) {
    return explicitUserid;
  }

  const email = normalizeField(
    record?.primaryEmail ?? record?.primary_email ?? record?.contact?.email
  );

  if (!email || !email.includes("@")) {
    return "";
  }

  return email.split("@")[0] ?? "";
}

function pickOfficeAddress(record: RawFacultyRecord): string {
  return normalizeField(
    record?.officeAddress ?? record?.office_address ?? record?.office ?? record?.address
  );
}

function mapCoursePreference(preference: RawFacultyRecord, index: number): CoursePreference {
  const coursePreference = normalizeField(preference?.coursePref ?? preference?.course_pref);

  return {
    teachingPreferenceId: normalizeField(
      preference?.teachingPreferenceId ??
        preference?.teaching_preference_id ??
        preference?.id ??
        String(index + 1)
    ),
    termCode: normalizeField(preference?.termCode ?? preference?.term_code),
    courseCode: normalizeField(
      preference?.courseCode ??
        preference?.course_code ??
        preference?.courseId ??
        preference?.course_id
    ),
    preferredCourseName: normalizeField(
      preference?.preferredCourseName ??
        preference?.preferred_course_name ??
        preference?.courseName ??
        preference?.course_name
    ),
    priority: preference?.priority ?? coursePreference,
  };
}

function mapLeaveItem(leave: RawFacultyRecord, index: number): LeaveItem {
  return {
    leaveId: normalizeField(leave?.leaveId ?? leave?.leave_id ?? `L-${index + 1}`),
    leaveType: normalizeField(leave?.leaveType ?? leave?.leave_type),
    startDate: normalizeField(leave?.startDate ?? leave?.start_date),
    endDate: normalizeField(leave?.endDate ?? leave?.end_date),
    location: normalizeField(leave?.location),
    reason: normalizeField(leave?.reason),
    backupFacultyPersonNumber: normalizeField(
      leave?.backupFacultyPersonNumber ?? leave?.backup_faculty_person_number
    ),
  };
}

function mapTeachingReductionItem(
  reduction: RawFacultyRecord,
  index: number
): TeachingReductionItem {
  return {
    teachingReductionId: normalizeField(
      reduction?.teachingReductionId ?? reduction?.teaching_reduction_id ?? `TR-${index + 1}`
    ),
    termCode: normalizeField(reduction?.termCode ?? reduction?.term_code),
    reductionType: normalizeField(reduction?.reductionType ?? reduction?.reduction_type),
    reductionAmount: reduction?.reductionAmount ?? reduction?.reduction_amount ?? "",
    reason: normalizeField(reduction?.reason),
    approvalDocumentId: normalizeField(
      reduction?.approvalDocumentId ?? reduction?.approval_document_id
    ),
    createdAt: normalizeField(reduction?.createdAt ?? reduction?.created_at),
  };
}

function mapCommitteeItem(committee: RawFacultyRecord, index: number): CommitteeItem {
  return {
    committeeId: normalizeField(
      committee?.committeeId ?? committee?.committee_id ?? `C-${index + 1}`
    ),
    committeeName: normalizeField(committee?.committeeName ?? committee?.committee_name),
    role: normalizeField(committee?.role),
    termCode: normalizeField(committee?.termCode ?? committee?.term_code),
  };
}

function mapAwardItem(award: RawFacultyRecord, index: number): AwardItem {
  return {
    awardId: normalizeField(award?.awardId ?? award?.award_id ?? `A-${index + 1}`),
    awardName: normalizeField(award?.awardName ?? award?.award_name),
    awardYear: normalizeField(String(award?.awardYear ?? award?.award_year ?? "")),
    organization: normalizeField(award?.organization),
  };
}

function mapStudentItem(student: RawFacultyRecord, index: number): StudentItem {
  return {
    studentId: normalizeField(
      student?.studentId ?? student?.student_id ?? student?.studentPersonNumber ?? `S-${index + 1}`
    ),
    studentName: normalizeField(
      student?.studentName ?? student?.student_name ?? student?.fullName ?? student?.name
    ),
    userid: normalizeField(student?.userid ?? student?.userId ?? student?.user_id),
    program: normalizeField(student?.program),
  };
}

function pickTeachingHistoryPayload(record: RawFacultyRecord): RawFacultyRecord | undefined {
  return (
    record?.teachingHistory ??
    record?.teaching_history ??
    record?.teachingHistoryResponse ??
    record?.teaching_history_response
  );
}

function mapTeachingHistoryItem(
  course: RawFacultyRecord,
  year: unknown,
  term: TermKey,
  index: number
): TeachingHistoryItem {
  return {
    teachingHistoryId: normalizeField(
      course?.teachingHistoryId ??
        course?.teaching_history_id ??
        course?.id ??
        `${year}-${term}-${course?.classNumber ?? course?.class_number ?? index + 1}`
    ),
    year: normalizeField(String(year ?? "")),
    term,
    classNumber: normalizeField(course?.classNumber ?? course?.class_number),
    courseName: normalizeField(course?.courseName ?? course?.course_name),
    courseType: normalizeField(course?.courseType ?? course?.course_type),
    courseCareer: normalizeField(course?.courseCareer ?? course?.course_career),
  };
}

const TERM_KEYS: TermKey[] = ["spring", "summer", "fall"];

function mapTeachingHistory(record: RawFacultyRecord): TeachingHistory {
  const historyPayload = pickTeachingHistoryPayload(record);
  const data = historyPayload?.data ?? historyPayload ?? {};
  const years = normalizeArray(data?.years);
  const rows: TeachingHistoryItem[] = [];

  years.forEach((yearEntry) => {
    TERM_KEYS.forEach((term) => {
      normalizeArray(yearEntry?.[term]).forEach((course, index) => {
        rows.push(mapTeachingHistoryItem(course, yearEntry?.year, term, index));
      });
    });
  });

  return {
    faculty: normalizeField(data?.faculty),
    facultySourceKey: normalizeField(data?.facultySourceKey ?? data?.faculty_source_key),
    years: years.map((yearEntry) => ({
      year: normalizeField(String(yearEntry?.year ?? "")),
      springCount: normalizeArray(yearEntry?.spring).length,
      summerCount: normalizeArray(yearEntry?.summer).length,
      fallCount: normalizeArray(yearEntry?.fall).length,
    })),
    rows,
  };
}

export function mapFacultyRecord(record: RawFacultyRecord, index: number): Faculty {
  const contactOfficeAddress = record?.contact?.officeAddress;
  const contactEmail = normalizeField(record?.contact?.email);
  const mappedRecord: Faculty = {
    name: normalizeField(record?.name ?? record?.fullName),
    userid: deriveUserid(record),
    officeAddress: normalizeField(
      pickOfficeAddress(record) || formatOfficeAddress(contactOfficeAddress)
    ),
    personNumber: normalizeField(record?.personNumber ?? record?.person_number),
    standardLoad: normalizeField(record?.standardLoad ?? record?.standard_load),
    nextPromotionDate: normalizeField(record?.nextPromotionDate ?? record?.next_promotion_date),
    backupFacultyPersonNumber: normalizeField(
      record?.backupFacultyPersonNumber ?? record?.backup_faculty_person_number
    ),
    profilePhotoDocumentId: normalizeField(
      record?.profilePhotoDocumentId ?? record?.profile_photo_document_id
    ),
    cvDocumentId: normalizeField(record?.cvDocumentId ?? record?.cv_document_id),
    profilePhotoUrl: normalizeField(record?.profilePhotoUrl ?? record?.profile_photo_url),
    titleLine: normalizeField(record?.titleLine ?? record?.title_line ?? record?.title),
    statusMessage: normalizeField(record?.statusMessage ?? record?.status_message),
    primaryEmail: normalizeField(record?.primaryEmail ?? record?.primary_email ?? contactEmail),
    secondaryEmail: normalizeField(record?.secondaryEmail ?? record?.secondary_email),
    physicalAddressLines: normalizeStringArray(
      record?.physicalAddressLines ??
        record?.physical_address_lines ??
        formatOfficeAddressLines(contactOfficeAddress)
    ),
    mailingAddressLines: normalizeStringArray(
      record?.mailingAddressLines ?? record?.mailing_address_lines
    ),
    socialLinks: normalizeStringArray(record?.socialLinks ?? record?.social_links),
    pronouns: normalizeField(record?.pronouns),
    primaryAppointment: normalizeField(
      record?.primaryAppointment ?? record?.primary_appointment ?? record?.rank
    ),
    researchTopics: normalizeStringArray(
      record?.researchTopics ??
        record?.research_topics ??
        record?.researchAreas ??
        record?.research_areas
    ),
    createdAt: normalizeField(record?.createdAt ?? record?.created_at),
    updatedAt: normalizeField(record?.updatedAt ?? record?.updated_at),
    leaves: normalizeArray(
      record?.leaves ?? record?.leave ?? record?.leaveSummary ?? record?.leave_summary
    ).map(mapLeaveItem),
    committees: normalizeArray(record?.committees ?? record?.committee).map(mapCommitteeItem),
    awards: normalizeArray(record?.awards ?? record?.award).map(mapAwardItem),
    students: normalizeArray(
      record?.students ??
        record?.student ??
        record?.studentsUnderProfessor ??
        record?.students_under_professor
    ).map(mapStudentItem),
    coursePreferences: normalizeArray(
      record?.coursePreferences ??
        record?.course_preferences ??
        record?.teachingPreferences ??
        record?.teaching_preferences
    ).map(mapCoursePreference),
    teachingReductions: normalizeArray(
      record?.teachingReductions ?? record?.teaching_reductions
    ).map(mapTeachingReductionItem),
    teachingHistory: mapTeachingHistory(record),
  };

  if (!mappedRecord.name || !mappedRecord.userid || !mappedRecord.officeAddress) {
    throw new Error(
      `Faculty record at index ${index} is missing one of the required fields: name, userid, officeAddress.`
    );
  }

  return mappedRecord;
}

export function mapFacultyCollection(payload: unknown): Faculty[] {
  const source = payload as RawFacultyRecord;
  const rawItems: RawFacultyRecord[] | null = Array.isArray(source)
    ? source
    : Array.isArray(source?.data)
      ? source.data
      : source?.data && typeof source.data === "object"
        ? [source.data]
        : Array.isArray(source?.faculty)
          ? source.faculty
          : source?.faculty && typeof source.faculty === "object"
            ? [source.faculty]
            : null;

  if (!rawItems) {
    throw new Error("Faculty API response must be an array or expose a data/faculty array.");
  }

  return rawItems.map(mapFacultyRecord);
}
