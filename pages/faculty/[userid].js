import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FacultyPortalHeader from "../../components/FacultyPortalHeader";
import PortalFooter from "../../components/PortalFooter";
import { APP_TITLE, getAppConfig } from "../../config/appConfig";
import {
  findFacultyByUserid,
  loadFacultyRecords,
} from "../../services/faculty/facultyService";

const DETAIL_TABS = {
  RESEARCH_AREA: "research-area",
  COURSE_PREFERENCE: "course-preference",
  LEAVE: "leave",
  COMMITTEE: "committee",
  AWARDS: "awards",
  STUDENT: "student",
};

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

  if (normalizedPriority === "1") {
    return "Preferred 1";
  }

  if (normalizedPriority === "2") {
    return "Preferred 2";
  }

  if (normalizedPriority === "3") {
    return "Preferred 3";
  }

  if (normalizedPriority === "qualified") {
    return "Qualified";
  }

  if (normalizedPriority === "not interested" || normalizedPriority === "not_interested") {
    return "Not Interested";
  }

  return displayValue(String(priority));
}

export default function FacultyDetailPage() {
  const router = useRouter();
  const { userid } = router.query;

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState(DETAIL_TABS.RESEARCH_AREA);

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

  const dashboardActiveTab =
    activeTab === DETAIL_TABS.COURSE_PREFERENCE ? DETAIL_TABS.COURSE_PREFERENCE : "profile";

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

    if (activeTab === DETAIL_TABS.COURSE_PREFERENCE) {
      return (
        <div className="faculty-preference-section faculty-preference-section-inline">
          <div className="faculty-preference-heading">
            <h2>Teaching Preferences</h2>
          </div>

          {faculty.coursePreferences.length > 0 ? (
            <div className="faculty-preference-table-wrapper">
              <table className="faculty-preference-table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Priority</th>
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
              </table>
            </div>
          ) : (
            <div className="faculty-table-status" role="status">
              No course preference data is available for this faculty record.
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
            <p>Recorded leave items for this faculty member.</p>
          </div>
          {faculty.leaves.length > 0 ? (
            <div className="faculty-preference-table-wrapper">
              <table className="faculty-preference-table">
                <thead>
                  <tr>
                    <th>Leave ID</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.leaves.map((leave) => (
                    <tr key={leave.leaveId}>
                      <td>{displayValue(leave.leaveId)}</td>
                      <td>{displayValue(leave.leaveType)}</td>
                      <td>{displayValue(leave.startDate)}</td>
                      <td>{displayValue(leave.endDate)}</td>
                      <td>{displayValue(leave.reason)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <p>Committee assignments associated with this faculty member.</p>
          </div>
          {faculty.committees.length > 0 ? (
            <div className="faculty-preference-table-wrapper">
              <table className="faculty-preference-table">
                <thead>
                  <tr>
                    <th>Committee ID</th>
                    <th>Committee Name</th>
                    <th>Role</th>
                    <th>Term Code</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.committees.map((committee) => (
                    <tr key={committee.committeeId}>
                      <td>{displayValue(committee.committeeId)}</td>
                      <td>{displayValue(committee.committeeName)}</td>
                      <td>{displayValue(committee.role)}</td>
                      <td>{displayValue(committee.termCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <div className="faculty-preference-table-wrapper">
              <table className="faculty-preference-table">
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
              </table>
            </div>
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
          <div className="faculty-preference-table-wrapper">
            <table className="faculty-preference-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Userid</th>
                  <th>Program</th>
                </tr>
              </thead>
              <tbody>
                {faculty.students.map((student) => (
                  <tr key={student.studentId}>
                    <td>{displayValue(student.studentId)}</td>
                    <td>{displayValue(student.studentName)}</td>
                    <td>{displayValue(student.userid)}</td>
                    <td>{displayValue(student.program)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    <div
                      className="faculty-detail-dashboard-nav"
                      role="tablist"
                      aria-label="Faculty detail tabs"
                    >
                      <button
                        type="button"
                        className={`faculty-detail-dashboard-item ${dashboardActiveTab === "profile" ? "is-active" : ""}`}
                        onClick={() => setActiveTab(DETAIL_TABS.RESEARCH_AREA)}
                        role="tab"
                        aria-selected={dashboardActiveTab === "profile"}
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
                      </button>

                      <button
                        type="button"
                        className={`faculty-detail-dashboard-item ${activeTab === DETAIL_TABS.COURSE_PREFERENCE ? "is-active" : ""}`}
                        onClick={() => setActiveTab(DETAIL_TABS.COURSE_PREFERENCE)}
                        role="tab"
                        aria-selected={activeTab === DETAIL_TABS.COURSE_PREFERENCE}
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
                        Course Preference
                      </button>
                    </div>
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
