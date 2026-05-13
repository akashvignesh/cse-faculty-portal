import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FacultyPortalHeader from "../../../components/FacultyPortalHeader";
import PortalFooter from "../../../components/PortalFooter";
import DataTableView from "../../../components/DataTableView";
import { APP_TITLE, getAppConfig } from "../../../config/appConfig";
import { courseCatalogMockData } from "../../../data/courseCatalogMockData";
import {
  findFacultyByUserid,
  loadFacultyRecords,
} from "../../../services/faculty/facultyService";
import { createFacultyDetailTableConfig } from "../../../services/faculty/facultyTableConfig";

const TAB_KEYS = {
  ALL: "all",
  PREFERRED: "preferred",
};

const PREFERENCE_OPTIONS = [
  { value: "preference1", label: "Preference 1" },
  { value: "preference2", label: "Preference 2" },
  { value: "preference3", label: "Preference 3" },
  { value: "not qualified", label: "Not Qualified" },
  { value: "qualified", label: "Qualified" },
];

function displayValue(value) {
  return value ? value : "Not available";
}

function normalizeSearch(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function courseSelectionKey(course) {
  return course.courseName;
}

function courseRowKey(course) {
  return `${course.subject}-${course.courseName}`;
}

export default function FacultyCoursePreferencePage() {
  const router = useRouter();
  const { userid } = router.query;

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState(TAB_KEYS.ALL);
  const [selections, setSelections] = useState({});
  const [submitMessage, setSubmitMessage] = useState("");

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

  const courseSelections = useMemo(() => {
    const nextSelections = {};

    for (const preference of faculty?.coursePreferences ?? []) {
      const selectionKey = preference.preferredCourseName || preference.courseCode;

      if (selectionKey) {
        nextSelections[selectionKey] = normalizeSearch(preference.priority);
      }
    }

    return nextSelections;
  }, [faculty]);

  useEffect(() => {
    if (!faculty) {
      return;
    }

    setSelections(courseSelections);
  }, [courseSelections, faculty]);

  const filteredAllCourses = useMemo(() => {
    return courseCatalogMockData;
  }, []);

  const preferredCourseRows = useMemo(() => {
    return courseCatalogMockData.filter((course) => Boolean(selections[courseSelectionKey(course)]));
  }, [selections]);

  function updateSelection(course, isSelected) {
    setSelections((currentSelections) => ({
      ...currentSelections,
      [courseSelectionKey(course)]: isSelected,
    }));
    setSubmitMessage("");
  }

  function handleSubmitPreferences() {
    const selectedCount = Object.values(selections).filter(Boolean).length;

    setSubmitMessage(`Saved ${selectedCount} course preference${selectedCount === 1 ? "" : "s"}.`);
  }

  function renderCourseTable(courses) {
    if (courses.length === 0) {
      return <div className="faculty-table-status" role="status">No courses match the current search.</div>;
    }

    const selectionRefreshKey = Object.entries(selections)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => `${key}:${value}`)
      .join("|");
    const tableRefreshKey = [
      activeTab,
      courses.length,
      selectionRefreshKey,
    ].join("-");

    return (
      <DataTableView
        key={tableRefreshKey}
        config={createFacultyDetailTableConfig({
          filename: `${faculty.userid}-${activeTab}-course-preferences`,
          title: `${faculty.name} ${activeTab === TAB_KEYS.ALL ? "All Courses" : "Preferred Courses"}`,
          showButtons: false,
        })}
        refreshKey={tableRefreshKey}
      >
          <thead>
            <tr>
              <th>Subject</th>
              <th>Course Name</th>
              <th>Preference</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => {
              const key = courseRowKey(course);
              const currentPreference = selections[courseSelectionKey(course)] ?? "";

              return (
                <tr key={key}>
                  <td>{displayValue(course.subject)}</td>
                  <td>{displayValue(course.courseName)}</td>
                  <td>
                    <div className="faculty-course-preference-checkbox-group">
                      {PREFERENCE_OPTIONS.map((option) => (
                        <label
                          className="faculty-course-preference-checkbox-label"
                          key={option.value}
                        >
                          <input
                            type="checkbox"
                            className="faculty-course-preference-checkbox"
                            checked={currentPreference === option.value}
                            onChange={(event) =>
                              updateSelection(
                                course,
                                event.target.checked ? option.value : ""
                              )
                            }
                            aria-label={`${option.label} for ${course.courseName}`}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
      </DataTableView>
    );
  }

  return (
    <>
      <Head>
        <title>
          {faculty ? `${faculty.name} Edit Course Preference | ${APP_TITLE}` : `Edit Course Preference | ${APP_TITLE}`}
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
                  Loading faculty course preferences...
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
                        className="faculty-detail-dashboard-item"
                        href={`/faculty/${faculty.userid}`}
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
                        className="faculty-detail-dashboard-item is-active"
                        href={`/faculty/${faculty.userid}/course-preference`}
                        aria-current="page"
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
                          <Link href={`/faculty/${faculty.userid}`}>Faculty</Link>
                          <span>&gt;</span>
                          <span>Edit Course Preference</span>
                        </nav>
                      </section>

                      <section className="faculty-secondary-card">
                        <div className="faculty-preference-heading">
                          <h2>Edit Course Preference</h2>
                          <p>{faculty.name}</p>
                        </div>

                        <div className="faculty-secondary-tabs" role="tablist" aria-label="Course preference tabs">
                          <button
                            type="button"
                            className={`faculty-secondary-tab ${activeTab === TAB_KEYS.ALL ? "is-active" : ""}`}
                            onClick={() => setActiveTab(TAB_KEYS.ALL)}
                            role="tab"
                            aria-selected={activeTab === TAB_KEYS.ALL}
                          >
                            All Courses
                          </button>
                          <button
                            type="button"
                            className={`faculty-secondary-tab ${activeTab === TAB_KEYS.PREFERRED ? "is-active" : ""}`}
                            onClick={() => setActiveTab(TAB_KEYS.PREFERRED)}
                            role="tab"
                            aria-selected={activeTab === TAB_KEYS.PREFERRED}
                          >
                            Preferred Courses
                          </button>
                        </div>

                        <div className="faculty-secondary-body">
                          <div className="faculty-secondary-section faculty-preference-section-inline">
                            <div className="faculty-preference-heading">
                              <h3>{activeTab === TAB_KEYS.ALL ? "All Courses" : "Preferred Courses"}</h3>
                            </div>

                            {activeTab === TAB_KEYS.ALL
                              ? renderCourseTable(filteredAllCourses)
                              : preferredCourseRows.length > 0
                                ? renderCourseTable(preferredCourseRows)
                                : <div className="faculty-table-status" role="status">No preferred courses have been selected yet.</div>}

                            {activeTab === TAB_KEYS.PREFERRED ? (
                              <div className="faculty-preference-actions">
                                <button
                                  type="button"
                                  className="faculty-course-preference-submit"
                                  onClick={handleSubmitPreferences}
                                >
                                  Submit
                                </button>

                                {submitMessage ? (
                                  <div className="faculty-course-preference-feedback" role="status">
                                    {submitMessage}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
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
