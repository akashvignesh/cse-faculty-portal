"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DetailSidebar from "@/components/faculty-detail/DetailSidebar";
import { APP_TITLE } from "@/config/appConfig";
import {
  getInitialYearDataForFaculty,
  INITIAL_ACADEMIC_YEARS,
} from "@/data/coursePreferenceMockData";
import { EditorError } from "@/lib/editor/client";
import { displayValue } from "@/lib/format";
import {
  loadStoredRoles,
  loadStoredYearPlan,
  saveCourseRankings,
  saveRoles,
  saveYearPlan,
  type StoredRoles,
  type StoredYearPlan,
} from "@/services/course-plan/coursePlanService";
import { fetchFacultyDetail } from "@/services/faculty/facultyDetailService";
import type { Faculty, PlannerCoursePreference, SemesterSlot, YearData } from "@/types/faculty";
import AcademicYearSelector from "./AcademicYearSelector";
import CoursePreferenceSection, { type SaveMessage } from "./CoursePreferenceSection";
import {
  addAcademicYear,
  applyBiannualCarryIn,
  createEmptyYearData,
  getBiannualCarryInSlots,
  getComputedAnnualLoad,
  getDefaultSemesterDistribution,
  SUMMER_COUNTS_TOWARD_LOAD,
  syncSemesterPlanToRequestedLoad,
  validateSemesterPlan,
} from "./coursePreferenceUtils";
import FacultyInfoCard from "./FacultyInfoCard";
import LoadSummaryCard from "./LoadSummaryCard";
import SemesterLoadSection from "./SemesterLoadSection";
import SemesterPlanningTable from "./SemesterPlanningTable";

export default function CoursePreferenceView({ userid }: { userid: string }) {
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [allYears, setAllYears] = useState([...INITIAL_ACADEMIC_YEARS]);
  const [selectedYear, setSelectedYear] = useState(
    INITIAL_ACADEMIC_YEARS[INITIAL_ACADEMIC_YEARS.length - 1]?.year ?? ""
  );
  const [yearDataMap, setYearDataMap] = useState<Record<string, YearData>>({});
  const [saveMessage, setSaveMessage] = useState<SaveMessage>({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState<"semester" | "courses">("semester");
  const [isSaving, setIsSaving] = useState(false);
  // Editor backend availability + per-year stored plans (diff/upsert baseline).
  const [storedPlans, setStoredPlans] = useState<Record<string, StoredYearPlan | null>>({});
  const [storedRoles, setStoredRoles] = useState<Record<string, StoredRoles | null>>({});
  const [editorAvailable, setEditorAvailable] = useState(false);
  const [prefsBaseline, setPrefsBaseline] = useState<Record<string, PlannerCoursePreference[]>>({});
  // Live catalog for the course-preference grid (empty → grid falls back to mock).
  const [catalog, setCatalog] = useState<{ subject: string; courseName: string }[]>([]);

  useEffect(() => {
    let isActive = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      setFaculty(null);

      try {
        const record = await fetchFacultyDetail(userid);
        if (isActive) {
          setFaculty(record);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            `Unable to load faculty data. ${error instanceof Error ? error.message : "Unknown error."}`
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    if (userid) {
      load();
    }

    return () => {
      isActive = false;
    };
  }, [userid]);

  useEffect(() => {
    document.title = faculty
      ? `${faculty.name} - Course Preference | ${APP_TITLE}`
      : `Course Preference | ${APP_TITLE}`;
  }, [faculty]);

  // Load the active course catalog once. In db mode this is the live catalog;
  // in mock mode the endpoint echoes the same mock list the grid falls back to.
  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/courses/active", {
          headers: { Accept: "application/json" },
        });
        const payload = (await res.json()) as {
          success: boolean;
          data?: { subject: string; courseName: string }[];
        };
        if (isActive && res.ok && payload.success && Array.isArray(payload.data)) {
          setCatalog(
            payload.data.map((c) => ({ subject: c.subject, courseName: c.courseName }))
          );
        }
      } catch {
        // Leave catalog empty; CoursePreferenceSection falls back to the mock list.
      }
    })();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!faculty) return;

    const initial = getInitialYearDataForFaculty(faculty.userid);

    if (initial) {
      setYearDataMap(initial);
      return;
    }

    // No existing data: build empty year map and seed biannual carry-forward
    // between consecutive years so the alternating pattern works from day one.
    const map: Record<string, YearData> = {};

    for (let i = 0; i < INITIAL_ACADEMIC_YEARS.length; i++) {
      const yr = INITIAL_ACADEMIC_YEARS[i];
      if (!yr) continue;
      const prevYr = i > 0 ? INITIAL_ACADEMIC_YEARS[i - 1]?.year : null;
      const base = createEmptyYearData();

      if (prevYr && map[prevYr]) {
        const carryIn = getBiannualCarryInSlots(map[prevYr]);
        map[yr.year] = applyBiannualCarryIn(base, carryIn);
      } else {
        map[yr.year] = base;
      }
    }

    setYearDataMap(map);
  }, [faculty]);

  // Capture the prefs baseline per year (for delete detection on save).
  useEffect(() => {
    setPrefsBaseline((current) => {
      if (current[selectedYear] || !yearDataMap[selectedYear]) return current;
      return {
        ...current,
        [selectedYear]: yearDataMap[selectedYear]?.coursePreferences ?? [],
      };
    });
  }, [yearDataMap, selectedYear]);

  // Overlay the stored DB plan (when the editor backend is available) on top
  // of the mock/empty scaffolding for the selected year.
  useEffect(() => {
    let isActive = true;

    async function loadStored() {
      if (!faculty?.personNumber || selectedYear in storedPlans) return;

      try {
        const [{ available, plan }, rolesResult] = await Promise.all([
          loadStoredYearPlan(faculty.personNumber, selectedYear),
          loadStoredRoles(faculty.personNumber, selectedYear),
        ]);
        if (!isActive) return;

        setEditorAvailable(available);
        setStoredPlans((current) => ({ ...current, [selectedYear]: plan }));
        setStoredRoles((current) => ({ ...current, [selectedYear]: rolesResult.stored }));

        const storedRoleList = rolesResult.stored?.roles ?? null;
        if (plan || storedRoleList) {
          setYearDataMap((current) => {
            const base = current[selectedYear] ?? createEmptyYearData();
            return {
              ...current,
              [selectedYear]: {
                ...base,
                ...(plan
                  ? {
                      facultyType: plan.facultyType ?? base.facultyType,
                      semesterPlan: plan.semesterPlan,
                      requestedLoad: {
                        summer: plan.semesterPlan.summer.length,
                        fall: plan.semesterPlan.fall.length,
                        spring: plan.semesterPlan.spring.length,
                      },
                    }
                  : {}),
                // A stored role set (even empty) is authoritative over the mock.
                roles: storedRoleList ?? base.roles,
              },
            };
          });
        }
      } catch {
        // Stored overlay is best effort; the mock scaffolding still works.
      }
    }

    loadStored();
    return () => {
      isActive = false;
    };
  }, [faculty, selectedYear, storedPlans]);

  const isCurrentYearLocked = useMemo(
    () => allYears.find((yr) => yr.year === selectedYear)?.locked ?? false,
    [allYears, selectedYear]
  );

  const currentYearData = useMemo(
    () => yearDataMap[selectedYear] ?? createEmptyYearData(),
    [yearDataMap, selectedYear]
  );

  function handleSelectYear(year: string) {
    setSelectedYear(year);
    setSaveMessage({ text: "", type: "" });
  }

  function handleAddYear() {
    const result = addAcademicYear(allYears, yearDataMap);
    if (!result) return;
    setAllYears(result.years);
    setYearDataMap((prev) => ({ ...prev, [result.newYear]: result.yearData }));
    setSelectedYear(result.newYear);
    setSaveMessage({
      text: `Added ${result.newYear}. Previous years are now locked; review and Save to persist.`,
      type: "success",
    });
  }

  function updateCurrentYearData(updater: (prev: YearData) => YearData) {
    if (isCurrentYearLocked) return;

    setSaveMessage({ text: "", type: "" });

    setYearDataMap((prev) => ({
      ...prev,
      [selectedYear]: updater(prev[selectedYear] ?? createEmptyYearData()),
    }));
  }

  function updateSemesterPlan(semester: "summer" | "fall" | "spring", newRows: SemesterSlot[]) {
    updateCurrentYearData((prev) => ({
      ...prev,
      semesterPlan: {
        ...prev.semesterPlan,
        [semester]: newRows,
      },
    }));
  }

  function updateCoursePreferences(newPrefs: PlannerCoursePreference[]) {
    updateCurrentYearData((prev) => ({
      ...prev,
      coursePreferences: newPrefs,
    }));
  }

  function handleToggleRole(role: string) {
    updateCurrentYearData((prev) => {
      const newRoles = prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];
      const newAnnualLoad = getComputedAnnualLoad(prev.facultyType, newRoles);
      const newRequestedLoad = getDefaultSemesterDistribution(newAnnualLoad);
      const newSemesterPlan = syncSemesterPlanToRequestedLoad(prev.semesterPlan, newRequestedLoad);
      return {
        ...prev,
        roles: newRoles,
        requestedLoad: newRequestedLoad,
        semesterPlan: newSemesterPlan,
      };
    });
  }

  async function handleSaveSemesterPlan() {
    if (!faculty) return;

    if (!editorAvailable || !faculty.personNumber) {
      setSaveMessage({ text: "Preferences saved (mock mode — not persisted).", type: "success" });
      return;
    }

    setIsSaving(true);
    try {
      const stored = storedPlans[selectedYear] ?? null;
      if (stored?.locked) {
        setSaveMessage({ text: `The ${selectedYear} plan is locked.`, type: "error" });
        return;
      }

      const result = await saveYearPlan({
        personNumber: faculty.personNumber,
        academicYear: selectedYear,
        facultyType: currentYearData.facultyType,
        semesterPlan: currentYearData.semesterPlan,
        storedPlan: stored,
      });

      // Persist the per-year roles alongside the plan.
      await saveRoles(
        faculty.personNumber,
        selectedYear,
        currentYearData.roles,
        storedRoles[selectedYear] ?? null
      );

      // Refresh the baselines so the next save diffs against what is stored.
      const [refreshed, refreshedRoles] = await Promise.all([
        loadStoredYearPlan(faculty.personNumber, selectedYear),
        loadStoredRoles(faculty.personNumber, selectedYear),
      ]);
      const refreshedPlan = refreshed.plan;
      setStoredPlans((current) => ({ ...current, [selectedYear]: refreshedPlan }));
      setStoredRoles((current) => ({ ...current, [selectedYear]: refreshedRoles.stored }));
      if (refreshedPlan) {
        setYearDataMap((current) => ({
          ...current,
          [selectedYear]: {
            ...(current[selectedYear] ?? createEmptyYearData()),
            semesterPlan: refreshedPlan.semesterPlan,
          },
        }));
      }

      setSaveMessage({
        text: `Semester plan saved (${result.slotsSaved} slot${result.slotsSaved === 1 ? "" : "s"}).`,
        type: "success",
      });
    } catch (error) {
      const message =
        error instanceof EditorError || error instanceof Error ? error.message : "Unknown error.";
      setSaveMessage({ text: `Save failed — ${message}`, type: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveCoursePreferences() {
    if (!faculty) return;

    setIsSaving(true);
    try {
      const result = await saveCourseRankings(
        faculty.userid || userid,
        selectedYear,
        currentYearData.coursePreferences,
        prefsBaseline[selectedYear] ?? []
      );
      setPrefsBaseline((current) => ({
        ...current,
        [selectedYear]: currentYearData.coursePreferences,
      }));
      setSaveMessage({
        text: `${result.message} (${result.totalProcessed} course${result.totalProcessed === 1 ? "" : "s"}).`,
        type: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      setSaveMessage({ text: `Save failed — ${message}`, type: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  function renderSemesterPlanning() {
    const annualLoad = getComputedAnnualLoad(currentYearData.facultyType, currentYearData.roles);
    const expectedSlots = Math.ceil(annualLoad);
    const sp = currentYearData.semesterPlan;
    // Summer only counts toward the load for Lecture 12 (PDF p4), so keep the
    // "planned" tally consistent with validateSemesterPlan's total.
    const countsSummer = SUMMER_COUNTS_TOWARD_LOAD[currentYearData.facultyType] ?? false;
    const totalSlots =
      (countsSummer ? (sp.summer?.length ?? 0) : 0) +
      (sp.fall?.length ?? 0) +
      (sp.spring?.length ?? 0);
    const planWarnings = validateSemesterPlan(sp, annualLoad, currentYearData.facultyType);

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
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566ZM8 5a.905.905 0 0 1 .9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5Zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
                </svg>
                {warning.message}
              </div>
            ))}

            {(["Summer", "Fall", "Spring"] as const).map((semester) => {
              const semesterKey = semester.toLowerCase() as "summer" | "fall" | "spring";
              return (
                <SemesterPlanningTable
                  key={semester}
                  semester={semester}
                  rows={sp[semesterKey] ?? []}
                  isLocked={isCurrentYearLocked}
                  canAdd={false}
                  onChange={(newRows) => updateSemesterPlan(semesterKey, newRows)}
                />
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
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
            <DetailSidebar userid={faculty.userid || userid} activePage="course-preference" />

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
                      <svg
                        viewBox="0 0 16 16"
                        width="14"
                        height="14"
                        fill="currentColor"
                        aria-hidden="true"
                      >
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
                    onToggleRole={handleToggleRole}
                  />

                  <LoadSummaryCard yearData={currentYearData} />

                  <div className="cp-tab-shell">
                    <div
                      className="cp-tab-list"
                      role="tablist"
                      aria-label="Course preference sections"
                    >
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
                        onAddYear={handleAddYear}
                      />

                      {activeTab === "semester" ? (
                        renderSemesterPlanning()
                      ) : (
                        <CoursePreferenceSection
                          preferences={currentYearData.coursePreferences}
                          isLocked={isCurrentYearLocked}
                          onChange={updateCoursePreferences}
                          onSave={handleSaveCoursePreferences}
                          saveMessage={saveMessage}
                          catalog={catalog}
                        />
                      )}
                    </div>
                  </div>

                  {!isCurrentYearLocked && activeTab === "semester" && (
                    <div className="cp-save-bar">
                      <button
                        type="button"
                        className="cp-save-btn"
                        onClick={handleSaveSemesterPlan}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving…" : "Save Preferences"}
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
  );
}
