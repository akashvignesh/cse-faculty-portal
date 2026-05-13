import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FacultyPortalHeader from "../../components/FacultyPortalHeader";
import PortalFooter from "../../components/PortalFooter";
import DataTableView from "../../components/DataTableView";
import { APP_TITLE, getAppConfig } from "../../config/appConfig";
import {
  findFacultyByUserid,
  loadFacultyRecords,
} from "../../services/faculty/facultyService";
import { createFacultyDetailTableConfig } from "../../services/faculty/facultyTableConfig";

const DETAIL_TABS = {
  RESEARCH_AREA: "research-area",
  TEACHING_HISTORY: "teaching-history",
  COURSE_PREFERENCE: "course-preference",
  LEAVE: "leave",
  COMMITTEE: "committee",
  AWARDS: "awards",
  STUDENT: "student",
};

const TEACHING_TERM_ORDER = ["spring", "summer", "fall"];

function displayValue(value) {
  return value ? value : "Not available";
}

function getInitials(name) {
  if (!name) {
    return "F";
  }

  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getFirstName(name) {
  return name?.split(" ")[0] || "Faculty";
}

function formatCoursePreferencePriority(priority) {
  const normalizedPriority =
    typeof priority === "string" ? priority.trim().toLowerCase() : String(priority).trim();

  if (!normalizedPriority) {
    return "Not available";
  }

  if (normalizedPriority === "1" || normalizedPriority === "preference1") {
    return "Preferred 1";
  }

  if (normalizedPriority === "2" || normalizedPriority === "preference2") {
    return "Preferred 2";
  }

  if (normalizedPriority === "3" || normalizedPriority === "preference3") {
    return "Preferred 3";
  }

  if (normalizedPriority === "qualified") {
    return "Qualified";
  }

  if (normalizedPriority === "not qualified") {
    return "Not Qualified";
  }

  if (normalizedPriority === "not interested" || normalizedPriority === "not_interested") {
    return "Not Interested";
  }

  return displayValue(String(priority));
}

function formatTerm(term) {
  if (!term) {
    return "Not available";
  }

  return term.charAt(0).toUpperCase() + term.slice(1);
}

function toggleFilterValue(values, value) {
  const normalizedValue = String(value);

  if (values.includes(normalizedValue)) {
    return values.filter((currentValue) => currentValue !== normalizedValue);
  }

  return [...values, normalizedValue];
}

function TeachingHistoryFilterDropdown({
  label,
  values,
  selectedValues,
  onToggle,
  onClear,
  formatValue = String,
}) {
  const selectedSet = new Set(selectedValues);
  const summaryText =
    selectedValues.length > 0
      ? `${label}: ${selectedValues.map((value) => formatValue(value)).join(", ")}`
      : `${label}: All`;

  return (
    <details className="faculty-history-filter">
      <summary className="faculty-history-filter-trigger">
        <span>{summaryText}</span>
        <span className="faculty-history-filter-caret" aria-hidden="true">
          &#9662;
        </span>
      </summary>
      <div className="faculty-history-filter-menu">
        <div className="faculty-history-filter-menu-title">{label}</div>
        {values.map((value) => {
          const normalizedValue = String(value);

          return (
            <label className="faculty-history-filter-option" key={normalizedValue}>
              <input
                type="checkbox"
                checked={selectedSet.has(normalizedValue)}
                onChange={() => onToggle(normalizedValue)}
              />
              <span>{formatValue(normalizedValue)}</span>
            </label>
          );
        })}
        {selectedValues.length > 0 ? (
          <button type="button" className="faculty-history-filter-clear" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
    </details>
  );
}

export default function FacultyDetailPage() {
  const router = useRouter();
  const { userid } = router.query;

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState(DETAIL_TABS.RESEARCH_AREA);
  const [teachingHistoryYearFilters, setTeachingHistoryYearFilters] = useState([]);
  const [teachingHistoryTermFilters, setTeachingHistoryTermFilters] = useState([]);

  useEffect(() => {
    let isActive = true;

    async function loadRecords() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const config = getAppConfig();
        const nextRecords = await loadFacultyRecords({ config });

        if (!isActive) {
          return;
        }

        setRecords(nextRecords);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setRecords([]);
        setErrorMessage(
          `Unable to load faculty data. ${error instanceof Error ? error.message : "Unknown error."}`
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setTeachingHistoryYearFilters([]);
    setTeachingHistoryTermFilters([]);
  }, [userid]);

  const faculty = useMemo(() => findFacultyByUserid(records, userid), [records, userid]);

  const biographyFields = faculty
    ? [
        { label: "Person Number", value: faculty.personNumber },
        { label: "Full Name", value: faculty.name },
        { label: "Userid", value: faculty.userid },
        { label: "Pronouns", value: faculty.pronouns },
        { label: "Primary Appointment", value: faculty.primaryAppointment },
        { label: "Standard Load", value: faculty.standardLoad },
        { label: "Next Promotion Date", value: faculty.nextPromotionDate },
        { label: "Campus Office Address", value: faculty.officeAddress },
        {
          label: "Backup Faculty Person Number",
          value: faculty.backupFacultyPersonNumber,
        },
      ]
    : [];

  function renderSecondarySection() {
    if (activeTab === DETAIL_TABS.RESEARCH_AREA) {
      return (
        <div className="faculty-secondary-section">
          <div className="faculty-preference-heading">
            <h2>Research Area</h2>
          </div>
          <div className="faculty-chip-list">
            {faculty.researchTopics.length > 0 ? (
              faculty.researchTopics.map((topic) => (
                <span className="faculty-chip" key={topic}>
                  {topic}
                </span>
              ))
            ) : (
              <div className="faculty-table-status" role="status">
                No research area data is available for this faculty record.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === DETAIL_TABS.TEACHING_HISTORY) {
      const teachingHistoryRows = faculty.teachingHistory?.rows ?? [];
      const availableTeachingHistoryYears = Array.from(
        new Set(
          teachingHistoryRows
            .map((course) => course.year)
            .filter((year) => year !== null && year !== undefined && year !== "")
            .map(String)
        )
      ).sort((firstYear, secondYear) => Number(secondYear) - Number(firstYear));
      const teachingHistoryTermSet = new Set(
        teachingHistoryRows.map((course) => course.term).filter(Boolean).map(String)
      );
      const availableTeachingHistoryTerms = [
        ...TEACHING_TERM_ORDER.filter((term) => teachingHistoryTermSet.has(term)),
        ...Array.from(teachingHistoryTermSet)
          .filter((term) => !TEACHING_TERM_ORDER.includes(term))
          .sort(),
      ];
      const selectedYearSet = new Set(teachingHistoryYearFilters);
      const selectedTermSet = new Set(teachingHistoryTermFilters);
      const filteredTeachingHistoryRows = teachingHistoryRows.filter((course) => {
        const matchesYear =
          teachingHistoryYearFilters.length === 0 || selectedYearSet.has(String(course.year));
        const matchesTerm =
          teachingHistoryTermFilters.length === 0 || selectedTermSet.has(String(course.term));

        return matchesYear && matchesTerm;
      });
      const yearCount = new Set(
        filteredTeachingHistoryRows
          .map((course) => course.year)
          .filter((year) => year !== null && year !== undefined && year !== "")
          .map(String)
      ).size;
      const courseCount = filteredTeachingHistoryRows.length;
      const graduateCount = filteredTeachingHistoryRows.filter(
        (course) => String(course.courseCareer).toLowerCase() === "graduate"
      ).length;
      const undergraduateCount = filteredTeachingHistoryRows.filter(
        (course) => String(course.courseCareer).toLowerCase() === "undergraduate"
      ).length;
      const teachingHistoryRefreshKey = [
        activeTab,
        faculty.userid,
        filteredTeachingHistoryRows.length,
        teachingHistoryYearFilters.join("-"),
        teachingHistoryTermFilters.join("-"),
      ].join("-");

      return (
        <div className="faculty-secondary-section">
          <div className="faculty-preference-heading">
            <h2>Teaching History</h2>
            <p>Courses taught by term and academic year.</p>
          </div>

          {teachingHistoryRows.length > 0 ? (
            <>
              <div className="faculty-history-filters" aria-label="Teaching history filters">
                <TeachingHistoryFilterDropdown
                  label="Year"
                  values={availableTeachingHistoryYears}
                  selectedValues={teachingHistoryYearFilters}
                  onToggle={(year) =>
                    setTeachingHistoryYearFilters((currentValues) =>
                      toggleFilterValue(currentValues, year)
                    )
                  }
                  onClear={() => setTeachingHistoryYearFilters([])}
                />
                <TeachingHistoryFilterDropdown
                  label="Term"
                  values={availableTeachingHistoryTerms}
                  selectedValues={teachingHistoryTermFilters}
                  onToggle={(term) =>
                    setTeachingHistoryTermFilters((currentValues) =>
                      toggleFilterValue(currentValues, term)
                    )
                  }
                  onClear={() => setTeachingHistoryTermFilters([])}
                  formatValue={formatTerm}
                />
              </div>

              <div className="faculty-history-summary" aria-label="Teaching history summary">
                <div className="faculty-history-summary-item">
                  <span>Years</span>
                  <strong>{yearCount}</strong>
                </div>
                <div className="faculty-history-summary-item">
                  <span>Classes</span>
                  <strong>{courseCount}</strong>
                </div>
                <div className="faculty-history-summary-item">
                  <span>Graduate</span>
                  <strong>{graduateCount}</strong>
                </div>
                <div className="faculty-history-summary-item">
                  <span>Undergraduate</span>
                  <strong>{undergraduateCount}</strong>
                </div>
              </div>

              {filteredTeachingHistoryRows.length > 0 ? (
                <DataTableView
                  key={teachingHistoryRefreshKey}
                  config={createFacultyDetailTableConfig({
                    filename: `${faculty.userid}-teaching-history`,
                    title: `${faculty.name} Teaching History`,
                    order: [[0, "desc"], [1, "asc"]],
                    showColumnVisibility: false,
                  })}
                  refreshKey={teachingHistoryRefreshKey}
                >
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Term</th>
                      <th>Class Number</th>
                      <th>Course Name</th>
                      <th>Course Type</th>
                      <th>Course Career</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachingHistoryRows.map((course) => (
                      <tr key={course.teachingHistoryId}>
                        <td>{displayValue(course.year)}</td>
                        <td>{formatTerm(course.term)}</td>
                        <td>{displayValue(course.classNumber)}</td>
                        <td>{displayValue(course.courseName)}</td>
                        <td>{displayValue(course.courseType)}</td>
                        <td>{displayValue(course.courseCareer)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTableView>
              ) : (
                <div className="faculty-table-status" role="status">
                  No teaching history matches the selected filters.
                </div>
              )}
            </>
          ) : (
            <div className="faculty-table-status" role="status">
              No teaching history data is available for this faculty record.
            </div>
          )}
        </div>
      );
    }

    if (activeTab === DETAIL_TABS.COURSE_PREFERENCE) {
      return (
        <div className="faculty-secondary-section">
          <div className="faculty-preference-heading">
            <h2>Course Preference</h2>
            <p>Current teaching preferences recorded for this faculty member.</p>
          </div>
          {faculty.coursePreferences.length > 0 ? (
            <DataTableView
              key={`${activeTab}-${faculty.userid}-course-preference`}
              config={createFacultyDetailTableConfig({
                filename: `${faculty.userid}-course-preference`,
                title: `${faculty.name} Course Preference`,
                showColumnVisibility: false,
              })}
              refreshKey={`${activeTab}-${faculty.userid}-${faculty.coursePreferences.length}`}
            >
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Preference</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.coursePreferences.map((preference) => (
                    <tr key={preference.teachingPreferenceId}>
                      <td>{displayValue(preference.courseCode)}</td>
                      <td>{displayValue(preference.preferredCourseName)}</td>
                      <td>{formatCoursePreferencePriority(preference.priority)}</td>
                    </tr>
                  ))}
                </tbody>
            </DataTableView>
          ) : (
            <div className="faculty-table-status" role="status">
              No current course preference data is available for this faculty record.
            </div>
          )}
        </div>
      );
    }

    if (activeTab === DETAIL_TABS.LEAVE) {
      return (
        <div className="faculty-secondary-section">
          <div className="faculty-preference-heading">
            <h2>Leave</h2>
          </div>
          {faculty.leaves.length > 0 ? (
            <DataTableView
              key={`${activeTab}-${faculty.userid}-leave`}
              config={createFacultyDetailTableConfig({
                filename: `${faculty.userid}-leave`,
                title: `${faculty.name} Leave`,
              })}
              refreshKey={`${activeTab}-${faculty.userid}-${faculty.leaves.length}`}
            >
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Location</th>
                    <th>Reason</th>
                    <th>Backup Faculty Person Number</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.leaves.map((leave) => (
                    <tr key={leave.leaveId}>
                      <td>{displayValue(leave.leaveType)}</td>
                      <td>{displayValue(leave.startDate)}</td>
                      <td>{displayValue(leave.endDate)}</td>
                      <td>{displayValue(leave.location)}</td>
                      <td>{displayValue(leave.reason)}</td>
                      <td>{displayValue(leave.backupFacultyPersonNumber)}</td>
                    </tr>
                  ))}
                </tbody>
            </DataTableView>
          ) : (
            <div className="faculty-table-status" role="status">
              No leave data is available for this faculty record.
            </div>
          )}
        </div>
      );
    }

    if (activeTab === DETAIL_TABS.COMMITTEE) {
      return (
        <div className="faculty-secondary-section">
          <div className="faculty-preference-heading">
            <h2>Committee</h2>
          </div>
          {faculty.committees.length > 0 ? (
            <DataTableView
              key={`${activeTab}-${faculty.userid}-committee`}
              config={createFacultyDetailTableConfig({
                filename: `${faculty.userid}-committee`,
                title: `${faculty.name} Committee`,
                showColumnVisibility: false,
              })}
              refreshKey={`${activeTab}-${faculty.userid}-${faculty.committees.length}`}
            >
                <thead>
                  <tr>
                    <th>Committee Name</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.committees.map((committee) => (
                    <tr key={committee.committeeId}>
                      <td>{displayValue(committee.committeeName)}</td>
                      <td>{displayValue(committee.role)}</td>
                    </tr>
                  ))}
                </tbody>
            </DataTableView>
          ) : (
            <div className="faculty-table-status" role="status">
              No committee data is available for this faculty record.
            </div>
          )}
        </div>
      );
    }

    if (activeTab === DETAIL_TABS.AWARDS) {
      return (
        <div className="faculty-secondary-section">
          <div className="faculty-preference-heading">
            <h2>Awards</h2>
            <p>Awards and honors associated with this faculty member.</p>
          </div>
          {faculty.awards.length > 0 ? (
            <DataTableView
              key={`${activeTab}-${faculty.userid}-awards`}
              config={createFacultyDetailTableConfig({
                filename: `${faculty.userid}-awards`,
                title: `${faculty.name} Awards`,
              })}
              refreshKey={`${activeTab}-${faculty.userid}-${faculty.awards.length}`}
            >
                <thead>
                  <tr>
                    <th>Award ID</th>
                    <th>Award Name</th>
                    <th>Award Year</th>
                    <th>Organization</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.awards.map((award) => (
                    <tr key={award.awardId}>
                      <td>{displayValue(award.awardId)}</td>
                      <td>{displayValue(award.awardName)}</td>
                      <td>{displayValue(award.awardYear)}</td>
                      <td>{displayValue(award.organization)}</td>
                    </tr>
                  ))}
                </tbody>
            </DataTableView>
          ) : (
            <div className="faculty-table-status" role="status">
              No awards data is available for this faculty record.
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="faculty-secondary-section">
        <div className="faculty-preference-heading">
          <h2>Student</h2>
          <p>Students linked to this faculty member.</p>
        </div>
        {faculty.students.length > 0 ? (
          <DataTableView
            key={`${activeTab}-${faculty.userid}-students`}
            config={createFacultyDetailTableConfig({
              filename: `${faculty.userid}-students`,
              title: `${faculty.name} Students`,
              showColumnVisibility: false,
            })}
            refreshKey={`${activeTab}-${faculty.userid}-${faculty.students.length}`}
          >
              <thead>
                <tr>
                  <th>Student Person Number</th>
                  <th>Full Name</th>
                  <th>Program</th>
                </tr>
              </thead>
              <tbody>
                {faculty.students.map((student) => (
                  <tr key={student.studentId}>
                    <td>{displayValue(student.studentId)}</td>
                    <td>{displayValue(student.studentName)}</td>
                    <td>{displayValue(student.program)}</td>
                  </tr>
                ))}
              </tbody>
          </DataTableView>
        ) : (
          <div className="faculty-table-status" role="status">
            No student data is available for this faculty record.
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {faculty ? `${faculty.name} | ${APP_TITLE}` : `Faculty Detail | ${APP_TITLE}`}
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="portal-page-shell">
        <div className="portal-page">
          <FacultyPortalHeader />

          <section className="faculty-detail-panel">
            {isLoading ? (
              <div className="faculty-detail-body">
                <div className="faculty-table-status" role="status">
                  Loading faculty details...
                </div>
              </div>
            ) : errorMessage ? (
              <div className="faculty-detail-body">
                <div className="faculty-table-status faculty-table-status-error" role="alert">
                  {errorMessage}
                </div>
              </div>
            ) : !faculty ? (
              <div className="faculty-detail-body">
                <div className="faculty-table-status faculty-table-status-error" role="alert">
                  No faculty detail was found for userid {displayValue(userid)}.
                </div>
              </div>
            ) : (
              <div className="faculty-detail-body">
                <div className="faculty-detail-workspace">
                  <aside className="faculty-detail-dashboard">
                    <nav className="faculty-detail-dashboard-nav" aria-label="Faculty detail pages">
                      <Link
                        className="faculty-detail-dashboard-item is-active"
                        href={userid ? `/faculty/${userid}` : "/"}
                        aria-current="page"
                      >
                        <span className="faculty-detail-dashboard-icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 16 16"
                            className="faculty-detail-dashboard-icon-svg"
                            focusable="false"
                          >
                            <path d="M8 8a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 8Zm0 1.25c-2.9 0-5.25 1.52-5.25 3.4V14h10.5v-1.35c0-1.88-2.35-3.4-5.25-3.4Z" />
                          </svg>
                        </span>
                        Profile
                      </Link>

                      <Link
                        className="faculty-detail-dashboard-item"
                        href={userid ? `/faculty/${userid}/course-preference` : "/"}
                      >
                        <span className="faculty-detail-dashboard-icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 16 16"
                            className="faculty-detail-dashboard-icon-svg"
                            focusable="false"
                          >
                            <path d="M3 4.25h10v1.5H3Zm0 3h10v1.5H3Zm0 3h10v1.5H3Z" />
                          </svg>
                        </span>
                        Edit Course Preference
                      </Link>
                    </nav>
                  </aside>

                  <div className="faculty-detail-content">
                    <div className="faculty-profile-layout">
                      <section
                        className="portal-page-intro portal-page-intro-compact"
                        aria-label="Page introduction"
                      >
                        <h1 className="portal-page-title">{APP_TITLE}</h1>
                        <nav className="portal-breadcrumb" aria-label="Breadcrumb">
                          <Link href="/">CSE Faculty Portal</Link>
                          <span>&gt;</span>
                          <span>Faculty</span>
                        </nav>
                      </section>

                      <section className="faculty-summary-card">
                        <div className="faculty-summary-card-header">
                          <h2>{faculty.name}</h2>
                          <p>{displayValue(faculty.titleLine)}</p>
                        </div>

                        <div className="faculty-summary-card-body">
                          <div className="faculty-summary-photo-block">
                            <div className="faculty-summary-photo">
                              {getInitials(faculty.name)}
                            </div>
                            <div className="faculty-summary-photo-caption">{faculty.name}</div>
                          </div>

                          <div className="faculty-summary-contact">
                            <h3>Email Addresses</h3>
                            <div className="faculty-summary-contact-list">
                              <a href={`mailto:${faculty.primaryEmail}`}>
                                {displayValue(faculty.primaryEmail)}
                              </a>
                              <a href={`mailto:${faculty.secondaryEmail}`}>
                                {displayValue(faculty.secondaryEmail)}
                              </a>
                            </div>
                          </div>

                          <div className="faculty-summary-contact">
                            <h3>Physical Addresses</h3>
                            <div className="faculty-summary-contact-list">
                              {faculty.physicalAddressLines.map((line) => (
                                <p key={line}>{line}</p>
                              ))}
                              {faculty.mailingAddressLines.map((line) => (
                                <p key={line}>{line}</p>
                              ))}
                            </div>
                          </div>

                          <div className="faculty-summary-contact">
                            <h3>Social Media</h3>
                            <div className="faculty-summary-contact-list">
                              {faculty.socialLinks.length > 0 ? (
                                faculty.socialLinks.map((link) => (
                                  <a
                                    href={`https://${link}`}
                                    key={link}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {link}
                                  </a>
                                ))
                              ) : (
                                <p>Not available</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="faculty-about-card">
                        <div className="faculty-about-card-header">
                          <h2>About {getFirstName(faculty.name)}</h2>
                        </div>

                        <div className="faculty-about-grid">
                          <div className="faculty-about-panel">
                            <div className="faculty-about-panel-title">Biography</div>
                            <div className="faculty-about-panel-grid">
                              {biographyFields.map((field) => (
                                <div className="faculty-about-field" key={field.label}>
                                  <div className="faculty-about-field-label">{field.label}</div>
                                  <div className="faculty-about-field-value">
                                    {displayValue(field.value)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="faculty-secondary-card">
                        <div
                          className="faculty-secondary-tabs"
                          role="tablist"
                          aria-label="Faculty sub sections"
                        >
                          <button
                            type="button"
                            className={`faculty-secondary-tab ${activeTab === DETAIL_TABS.RESEARCH_AREA ? "is-active" : ""}`}
                            onClick={() => setActiveTab(DETAIL_TABS.RESEARCH_AREA)}
                            role="tab"
                            aria-selected={activeTab === DETAIL_TABS.RESEARCH_AREA}
                          >
                            Research Area
                          </button>
                          <button
                            type="button"
                            className={`faculty-secondary-tab ${activeTab === DETAIL_TABS.TEACHING_HISTORY ? "is-active" : ""}`}
                            onClick={() => setActiveTab(DETAIL_TABS.TEACHING_HISTORY)}
                            role="tab"
                            aria-selected={activeTab === DETAIL_TABS.TEACHING_HISTORY}
                          >
                            Teaching History
                          </button>
                          <button
                            type="button"
                            className={`faculty-secondary-tab ${activeTab === DETAIL_TABS.COURSE_PREFERENCE ? "is-active" : ""}`}
                            onClick={() => setActiveTab(DETAIL_TABS.COURSE_PREFERENCE)}
                            role="tab"
                            aria-selected={activeTab === DETAIL_TABS.COURSE_PREFERENCE}
                          >
                            Course Preference
                          </button>
                          <button
                            type="button"
                            className={`faculty-secondary-tab ${activeTab === DETAIL_TABS.LEAVE ? "is-active" : ""}`}
                            onClick={() => setActiveTab(DETAIL_TABS.LEAVE)}
                            role="tab"
                            aria-selected={activeTab === DETAIL_TABS.LEAVE}
                          >
                            Leave
                          </button>
                          <button
                            type="button"
                            className={`faculty-secondary-tab ${activeTab === DETAIL_TABS.COMMITTEE ? "is-active" : ""}`}
                            onClick={() => setActiveTab(DETAIL_TABS.COMMITTEE)}
                            role="tab"
                            aria-selected={activeTab === DETAIL_TABS.COMMITTEE}
                          >
                            Committee
                          </button>
                          <button
                            type="button"
                            className={`faculty-secondary-tab ${activeTab === DETAIL_TABS.AWARDS ? "is-active" : ""}`}
                            onClick={() => setActiveTab(DETAIL_TABS.AWARDS)}
                            role="tab"
                            aria-selected={activeTab === DETAIL_TABS.AWARDS}
                          >
                            Awards
                          </button>
                          <button
                            type="button"
                            className={`faculty-secondary-tab ${activeTab === DETAIL_TABS.STUDENT ? "is-active" : ""}`}
                            onClick={() => setActiveTab(DETAIL_TABS.STUDENT)}
                            role="tab"
                            aria-selected={activeTab === DETAIL_TABS.STUDENT}
                          >
                            Student
                          </button>
                        </div>

                        <div className="faculty-secondary-body">{renderSecondarySection()}</div>
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <PortalFooter />
        </div>
      </div>
    </>
  );
}
