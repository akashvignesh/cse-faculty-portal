function normalizeField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeStringArray(value) {
  return normalizeArray(value)
    .map(normalizeField)
    .filter(Boolean);
}

function pickOfficeAddress(record) {
  return normalizeField(
    record?.officeAddress ?? record?.office_address ?? record?.office ?? record?.address
  );
}

function mapCoursePreference(preference, index) {
  return {
    teachingPreferenceId: normalizeField(
      preference?.teachingPreferenceId ??
      preference?.teaching_preference_id ??
      preference?.id ??
      String(index + 1)
    ),
    termCode: normalizeField(preference?.termCode ?? preference?.term_code),
    courseCode: normalizeField(preference?.courseCode ?? preference?.course_code),
    preferredCourseName: normalizeField(
      preference?.preferredCourseName ?? preference?.preferred_course_name ?? preference?.courseName
    ),
    priority: preference?.priority ?? "",
  };
}

function mapLeaveItem(leave, index) {
  return {
    leaveId: normalizeField(leave?.leaveId ?? leave?.leave_id ?? `L-${index + 1}`),
    leaveType: normalizeField(leave?.leaveType ?? leave?.leave_type),
    startDate: normalizeField(leave?.startDate ?? leave?.start_date),
    endDate: normalizeField(leave?.endDate ?? leave?.end_date),
    reason: normalizeField(leave?.reason),
  };
}

function mapCommitteeItem(committee, index) {
  return {
    committeeId: normalizeField(
      committee?.committeeId ?? committee?.committee_id ?? `C-${index + 1}`
    ),
    committeeName: normalizeField(committee?.committeeName ?? committee?.committee_name),
    role: normalizeField(committee?.role),
    termCode: normalizeField(committee?.termCode ?? committee?.term_code),
  };
}

function mapAwardItem(award, index) {
  return {
    awardId: normalizeField(award?.awardId ?? award?.award_id ?? `A-${index + 1}`),
    awardName: normalizeField(award?.awardName ?? award?.award_name),
    awardYear: normalizeField(String(award?.awardYear ?? award?.award_year ?? "")),
    organization: normalizeField(award?.organization),
  };
}

function mapStudentItem(student, index) {
  return {
    studentId: normalizeField(student?.studentId ?? student?.student_id ?? `S-${index + 1}`),
    studentName: normalizeField(student?.studentName ?? student?.student_name ?? student?.name),
    userid: normalizeField(student?.userid ?? student?.userId ?? student?.user_id),
    program: normalizeField(student?.program),
  };
}

export function mapFacultyRecord(record, index) {
  const mappedRecord = {
    name: normalizeField(record?.name),
    userid: normalizeField(record?.userid ?? record?.userId ?? record?.user_id),
    officeAddress: pickOfficeAddress(record),
    personNumber: normalizeField(record?.personNumber ?? record?.person_number),
    standardLoad: normalizeField(record?.standardLoad ?? record?.standard_load),
    nextPromotionDate: normalizeField(
      record?.nextPromotionDate ?? record?.next_promotion_date
    ),
    backupFacultyPersonNumber: normalizeField(
      record?.backupFacultyPersonNumber ?? record?.backup_faculty_person_number
    ),
    profilePhotoDocumentId: normalizeField(
      record?.profilePhotoDocumentId ?? record?.profile_photo_document_id
    ),
    cvDocumentId: normalizeField(record?.cvDocumentId ?? record?.cv_document_id),
    titleLine: normalizeField(record?.titleLine ?? record?.title_line),
    statusMessage: normalizeField(record?.statusMessage ?? record?.status_message),
    primaryEmail: normalizeField(record?.primaryEmail ?? record?.primary_email),
    secondaryEmail: normalizeField(record?.secondaryEmail ?? record?.secondary_email),
    physicalAddressLines: normalizeStringArray(
      record?.physicalAddressLines ?? record?.physical_address_lines
    ),
    mailingAddressLines: normalizeStringArray(
      record?.mailingAddressLines ?? record?.mailing_address_lines
    ),
    socialLinks: normalizeStringArray(record?.socialLinks ?? record?.social_links),
    pronouns: normalizeField(record?.pronouns),
    primaryAppointment: normalizeField(
      record?.primaryAppointment ?? record?.primary_appointment
    ),
    researchTopics: normalizeStringArray(record?.researchTopics ?? record?.research_topics),
    createdAt: normalizeField(record?.createdAt ?? record?.created_at),
    updatedAt: normalizeField(record?.updatedAt ?? record?.updated_at),
    leaves: normalizeArray(record?.leaves ?? record?.leave).map(mapLeaveItem),
    committees: normalizeArray(record?.committees ?? record?.committee).map(mapCommitteeItem),
    awards: normalizeArray(record?.awards ?? record?.award).map(mapAwardItem),
    students: normalizeArray(record?.students ?? record?.student).map(mapStudentItem),
    coursePreferences: normalizeArray(
      record?.coursePreferences ?? record?.course_preferences
    ).map(mapCoursePreference),
  };

  if (!mappedRecord.name || !mappedRecord.userid || !mappedRecord.officeAddress) {
    throw new Error(
      `Faculty record at index ${index} is missing one of the required fields: name, userid, officeAddress.`
    );
  }

  return mappedRecord;
}

export function mapFacultyCollection(payload) {
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.faculty)
        ? payload.faculty
        : null;

  if (!rawItems) {
    throw new Error(
      "Faculty API response must be an array or expose a data/faculty array."
    );
  }

  return rawItems.map(mapFacultyRecord);
}
