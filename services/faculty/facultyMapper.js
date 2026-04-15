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

function formatOfficeAddress(address) {
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

function formatOfficeAddressLines(address) {
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

function deriveUserid(record) {
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

  return email.split("@")[0];
}

function pickOfficeAddress(record) {
  return normalizeField(
    record?.officeAddress ?? record?.office_address ?? record?.office ?? record?.address
  );
}

function mapCoursePreference(preference, index) {
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
      preference?.courseCode ?? preference?.course_code ?? preference?.courseId ?? preference?.course_id
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

function mapLeaveItem(leave, index) {
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

function mapTeachingReductionItem(reduction, index) {
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

export function mapFacultyRecord(record, index) {
  const contactOfficeAddress = record?.contact?.officeAddress;
  const contactEmail = normalizeField(record?.contact?.email);
  const mappedRecord = {
    name: normalizeField(record?.name ?? record?.fullName),
    userid: deriveUserid(record),
    officeAddress: normalizeField(
      pickOfficeAddress(record) || formatOfficeAddress(contactOfficeAddress)
    ),
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
      record?.researchTopics ?? record?.research_topics ?? record?.researchAreas ?? record?.research_areas
    ),
    createdAt: normalizeField(record?.createdAt ?? record?.created_at),
    updatedAt: normalizeField(record?.updatedAt ?? record?.updated_at),
    leaves: normalizeArray(record?.leaves ?? record?.leave ?? record?.leaveSummary ?? record?.leave_summary).map(
      mapLeaveItem
    ),
    committees: normalizeArray(record?.committees ?? record?.committee).map(mapCommitteeItem),
    awards: normalizeArray(record?.awards ?? record?.award).map(mapAwardItem),
    students: normalizeArray(
      record?.students ?? record?.student ?? record?.studentsUnderProfessor ?? record?.students_under_professor
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
      : payload?.data && typeof payload.data === "object"
        ? [payload.data]
      : Array.isArray(payload?.faculty)
        ? payload.faculty
        : payload?.faculty && typeof payload.faculty === "object"
          ? [payload.faculty]
        : null;

  if (!rawItems) {
    throw new Error(
      "Faculty API response must be an array or expose a data/faculty array."
    );
  }

  return rawItems.map(mapFacultyRecord);
}
