import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FacultyPortalHeader from "../../../components/FacultyPortalHeader";
import PortalFooter from "../../../components/PortalFooter";
import AcademicYearSelector from "../../../components/course-preference/AcademicYearSelector";
import FacultyInfoCard from "../../../components/course-preference/FacultyInfoCard";
import SemesterLoadSection from "../../../components/course-preference/SemesterLoadSection";
import SemesterPlanningTable from "../../../components/course-preference/SemesterPlanningTable";
import CoursePreferenceSection from "../../../components/course-preference/CoursePreferenceSection";
import {
  createEmptyYearData,
  getComputedAnnualLoad,
  validateSemesterPlan,
  getBiannualCarryInSlots,
  applyBiannualCarryIn,
} from "../../../components/course-preference/coursePreferenceUtils";
import {
  INITIAL_ACADEMIC_YEARS,
  getInitialYearDataForFaculty,
} from "../../../data/coursePreferenceMockData";
import { APP_TITLE, getAppConfig } from "../../../config/appConfig";
import {
  findFacultyByUserid,
  loadFacultyRecords,
} from "../../../services/faculty/facultyService";

function displayValue(value) {
  return value ? value : "Not available";
}

function SidebarNav({ faculty }) {
  return (
    <aside className="faculty-detail-dashboard">
      <nav className="faculty-detail-dashboard-nav" aria-label="Faculty detail pages">
        <Link className="faculty-detail-dashboard-item" href={`/faculty/${faculty.userid}`}>
          <span className="faculty-detail-dashboard-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" className="faculty-detail-dashboard-icon-svg" focusable="false">
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
            <svg viewBox="0 0 16 16" className="faculty-detail-dashboard-icon-svg" focusable="false">
              <path d="M3 4.25h10v1.5H3Zm0 3h10v1.5H3Zm0 3h10v1.5H3Z" />
            </svg>
          </span>
          Course Preference
        </Link>
      </nav>
    </aside>
  );
}

export default function FacultyCoursePreferencePage() {
  const router = useRouter();
  const { userid } = router.query;

  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [allYears] = useState([...INITIAL_ACADEMIC_YEARS]);
  const [selectedYear, setSelectedYear] = useState(
    INITIAL_ACADEMIC_YEARS[INITIAL_ACADEMIC_YEARS.length - 1].year
  );
  const [yearDataMap, setYearDataMap] = useState({});
  const [saveMessage, setSaveMessage] = useState({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState("semester");

  useEffect(() => {
    let isActive = true;
    async function loadRecords() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const config = getAppConfig();
        const nextRecords = await loadFacultyRecords({ config });
        if (isActive) setRecords(nextRecords);
      } catch (error) {
        if (isActive) {
          setRecords([]);
          setErrorMessage(
            `Unable to load faculty data. ${error instanceof Error ? error.message : "Unknown error."}`
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    loadRecords();
    return () => {
      isActive = false;
    };
  }, []);

  const faculty = useMemo(() => findFacultyByUserid(records, userid), [records, userid]);

  useEffect(() => {
    if (!faculty) return;
    const initial = getInitialYearDataForFaculty(faculty.userid);
    if (initial) {
      setYearDataMap(initial);
      return;
    }

    // No existing data: build empty year map and seed biannual carry-forward
    // between consecutive years so the alternating pattern works from day one.
    const map = {};
    for (let i = 0; i < INITIAL_ACADEMIC_YEARS.length; i++) {
      const yr = INITIAL_ACADEMIC_YEARS[i];
      const prevYr = i > 0 ? INITIAL_ACADEMIC_YEARS[i - 1].year : null;
      const base = createEmptyYearData();
      if (prevYr) {
        const carryIn = getBiannualCarryInSlots(map[prevYr]);
        map[yr.year] = applyBiannualCarryIn(base, carryIn);
      } else {
        map[yr.year] = base;
      }
    }
    setYearDataMap(map);
  }, [faculty]);

  const isCurrentYearLocked = useMemo(
    () => allYears.find((yr) => yr.year === selectedYear)?.locked ?? false,
    [allYears, selectedYear]
  );

  const currentYearData = useMemo(
    () => yearDataMap[selectedYear] ?? createEmptyYearData(),
    [yearDataMap, selectedYear]
  );

  function handleSelectYear(year) {
    setSelectedYear(year);
    setSaveMessage({ text: "", type: "" });
  }

  function updateCurrentYearData(updater) {
    if (isCurrentYearLocked) return;
    setSaveMessage({ text: "", type: "" });
    setYearDataMap((prev) => ({
      ...prev,
      [selectedYear]: updater(prev[selectedYear] ?? createEmptyYearData()),
    }));
  }

  function updateSemesterPlan(semester, newRows) {
    updateCurrentYearData((prev) => ({
      ...prev,
      semesterPlan: { ...prev.semesterPlan, [semester]: newRows },
    }));
  }

  function updateCoursePreferences(newPrefs) {
    updateCurrentYearData((prev) => ({ ...prev, coursePreferences: newPrefs }));
  }

  function handleSave() {
    setSaveMessage({ text: "Preferences saved successfully (mock).", type: "success" });
  }

  function renderSemesterPlanning() {
    const annualLoad = getComputedAnnualLoad(currentYearData.facultyType, currentYearData.roles);
    const expectedSlots = Math.ceil(annualLoad);
    const sp = currentYearData.semesterPlan;
    const totalSlots =
      (sp.summer?.length ?? 0) + (sp.fall?.length ?? 0) + (sp.spring?.length ?? 0);
    const planWarnings = validateSemesterPlan(sp, annualLoad);

    return (
      <>
        <SemesterLoadSection
          yearData={currentYearData}
          isLocked={isCurrentYearLocked}
          onUpdateYearData={updateCurrentYearData}
        />

        <div className="cp-section-card">
          <div className="cp-section-header">
            <h3 className="cp-section-title">Semester Planning</h3>
            <div className="cp-section-header-right">
              <span className="cp-annual-load-tag">
                {totalSlots} / {expectedSlots} slot{expectedSlots !== 1 ? "s" : ""} planned
              </span>
              {isCurrentYearLocked && <span className="cp-locked-badge">Read-only</span>}
            </div>
          </div>
          <div className="cp-section-body cp-semester-tables-body">
            {planWarnings.map((warning, index) => (
              <div
                key={index}
                className={`cp-validation-banner cp-validation-banner-${warning.type}`}
                role="alert"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566ZM8 5a.905.905 0 0 1 .9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5Zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
                </svg>
                {warning.message}
              </div>
            ))}
            {["Summer", "Fall", "Spring"].map((semester) => (
              <SemesterPlanningTable
                key={semester}
                semester={semester}
                rows={sp[semester.toLowerCase()] ?? []}
                isLocked={isCurrentYearLocked}
                canAdd={false}
                onChange={(newRows) => updateSemesterPlan(semester.toLowerCase(), newRows)}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>
          {faculty
            ? `${faculty.name} - Course Preference | ${APP_TITLE}`
            : `Course Preference | ${APP_TITLE}`}
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
                  No faculty record found for userid {displayValue(userid)}.
                </div>
              </div>
            ) : (
              <div className="faculty-detail-body">
                <div className="faculty-detail-workspace">
                  <SidebarNav faculty={faculty} />

                  <div className="faculty-detail-content">
                    <div className="faculty-profile-layout">
                      <section
                        className="portal-page-intro portal-page-intro-compact"
                        aria-label="Page introduction"
                      >
                        <h1 className="portal-page-title">{APP_TITLE}</h1>
                        <nav className="portal-breadcrumb" aria-label="Breadcrumb">
                          <Link href="/">CSE Faculty Portal</Link>
                          <span aria-hidden="true">&gt;</span>
                          <Link href={`/faculty/${faculty.userid}`}>{faculty.name}</Link>
                          <span aria-hidden="true">&gt;</span>
                          <span>Course Preference</span>
                        </nav>
                      </section>

                      <div className="cp-page-heading">
                        <div>
                          <h2 className="cp-page-title">Course Preference</h2>
                          <p className="cp-page-subtitle">{faculty.name}</p>
                        </div>
                        {isCurrentYearLocked && (
                          <div className="cp-readonly-notice" role="status">
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
                              <path d="M11.5 7V5.5a3.5 3.5 0 0 0-7 0V7H3v7.5h10V7h-1.5ZM6 5.5a2 2 0 1 1 4 0V7H6V5.5Z" />
                            </svg>
                            Viewing read-only data for {selectedYear}
                          </div>
                        )}
                      </div>

                      <div className="cp-sections-stack">
                        <FacultyInfoCard
                          faculty={faculty}
                          yearData={currentYearData}
                          isLocked={isCurrentYearLocked}
                        />

                        <div className="cp-tab-shell">
                          <div className="cp-tab-list" role="tablist" aria-label="Course preference sections">
                            <button
                              type="button"
                              role="tab"
                              aria-selected={activeTab === "semester"}
                              className={`cp-tab-btn${activeTab === "semester" ? " is-active" : ""}`}
                              onClick={() => setActiveTab("semester")}
                            >
                              Semester Planning
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={activeTab === "courses"}
                              className={`cp-tab-btn${activeTab === "courses" ? " is-active" : ""}`}
                              onClick={() => setActiveTab("courses")}
                            >
                              Course Preferences
                            </button>
                          </div>

                          <div className="cp-tab-panel">
                            <AcademicYearSelector
                              years={allYears}
                              selectedYear={selectedYear}
                              onSelectYear={handleSelectYear}
                            />

                            {activeTab === "semester" ? (
                              renderSemesterPlanning()
                            ) : (
                              <CoursePreferenceSection
                                preferences={currentYearData.coursePreferences}
                                isLocked={isCurrentYearLocked}
                                onChange={updateCoursePreferences}
                                onSave={handleSave}
                                saveMessage={saveMessage}
                              />
                            )}
                          </div>
                        </div>

                        {!isCurrentYearLocked && activeTab === "semester" && (
                          <div className="cp-save-bar">
                            <button type="button" className="cp-save-btn" onClick={handleSave}>
                              Save Preferences
                            </button>
                            {saveMessage.text && (
                              <span
                                className={`cp-save-message cp-save-message-${saveMessage.type}`}
                                role="status"
                              >
                                {saveMessage.text}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
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
