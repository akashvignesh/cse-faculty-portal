"use client";

import { useMemo, useState } from "react";
import { courseCatalogMockData } from "@/data/courseCatalogMockData";
import type { PlannerCoursePreference } from "@/types/faculty";
import { genId, RANKING_LABELS, RANKING_OPTIONS } from "./coursePreferenceUtils";

interface CatalogCourse {
  subject: string;
  courseName: string;
}

export interface SaveMessage {
  text: string;
  type: string;
}

export interface CoursePreferenceSectionProps {
  preferences: PlannerCoursePreference[];
  isLocked: boolean;
  onChange: (preferences: PlannerCoursePreference[]) => void;
  onSave: () => void;
  saveMessage: SaveMessage;
  /** Live catalog courses; falls back to the mock catalog when empty. */
  catalog?: CatalogCourse[];
}

type PreferenceView = "selected" | "not-qualified" | "not-selected";

function buildPrefLookup(
  preferences: PlannerCoursePreference[]
): Record<string, PlannerCoursePreference> {
  return Object.fromEntries(preferences.map((p) => [p.courseName, p]));
}

function deriveCourseCode(entry: CatalogCourse | null | undefined): string {
  if (!entry) return "";
  const firstToken = entry.courseName.split("-")[0] ?? "";
  return `${entry.subject}${firstToken}`.trim();
}

export default function CoursePreferenceSection({
  preferences,
  isLocked,
  onChange,
  onSave,
  saveMessage,
  catalog,
}: CoursePreferenceSectionProps) {
  const [activeView, setActiveView] = useState<PreferenceView>("selected");
  const [retainedNotSelectedCourses, setRetainedNotSelectedCourses] = useState<string[]>([]);
  const prefLookup = buildPrefLookup(preferences);
  const retainedNotSelectedSet = useMemo(
    () => new Set(retainedNotSelectedCourses),
    [retainedNotSelectedCourses]
  );
  // Live catalog when available, otherwise the mock catalog (also the fallback
  // when the courses endpoint is unreachable).
  const courses = useMemo<CatalogCourse[]>(
    () => (catalog && catalog.length > 0 ? catalog : (courseCatalogMockData as CatalogCourse[])),
    [catalog]
  );
  const courseRows = useMemo(
    () =>
      courses.map((course) => {
        const pref = prefLookup[course.courseName];
        return {
          course,
          currentRank: pref ? pref.ranking : null,
          code: deriveCourseCode(course),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preferences, courses]
  );
  const selectedRows = courseRows.filter((row) => row.currentRank !== null && row.currentRank > 0);
  const notQualifiedRows = courseRows.filter((row) => row.currentRank === 0);
  const visibleRows =
    activeView === "selected"
      ? selectedRows
      : activeView === "not-qualified"
        ? notQualifiedRows
        : courseRows.filter(
            (row) => row.currentRank === null || retainedNotSelectedSet.has(row.course.courseName)
          );
  const selectedCount = selectedRows.length;
  const notQualifiedCount = notQualifiedRows.length;
  const notSelectedCount = courses.length - preferences.length;

  function handleRankClick(course: CatalogCourse, rank: number) {
    const existing = prefLookup[course.courseName];
    if (activeView === "not-selected") {
      setRetainedNotSelectedCourses((prev) =>
        prev.includes(course.courseName) ? prev : [...prev, course.courseName]
      );
    }

    if (existing) {
      if (existing.ranking === rank) {
        onChange(preferences.filter((p) => p.courseName !== course.courseName));
      } else {
        onChange(
          preferences.map((p) => (p.courseName === course.courseName ? { ...p, ranking: rank } : p))
        );
      }
    } else {
      onChange([
        ...preferences,
        {
          id: genId("cp"),
          courseCode: deriveCourseCode(course),
          courseName: course.courseName,
          ranking: rank,
        },
      ]);
    }
  }

  function nqLabel(n: number): string | null {
    if (n === 0) return "NQ";
    if (n === 1) return "Least";
    if (n === 5) return "Most";
    return null;
  }

  return (
    <div className="cp-section-card">
      <div className="cp-section-header">
        <h3 className="cp-section-title">Course Preferences</h3>
        <div className="cp-section-header-right">
          {isLocked && <span className="cp-locked-badge">Read-only</span>}
        </div>
      </div>

      <div className="cp-section-body">
        <div className="cp-pref-toolbar">
          <div className="cp-pref-view-tabs" role="tablist" aria-label="Filter course preferences">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "not-qualified"}
              className={`cp-pref-view-tab cp-pref-view-tab-nq${activeView === "not-qualified" ? " is-active" : ""}`}
              onClick={() => setActiveView("not-qualified")}
            >
              Not Qualified
              <span>{notQualifiedCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "selected"}
              className={`cp-pref-view-tab${activeView === "selected" ? " is-active" : ""}`}
              onClick={() => setActiveView("selected")}
            >
              Selected
              <span>{selectedCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "not-selected"}
              className={`cp-pref-view-tab${activeView === "not-selected" ? " is-active" : ""}`}
              onClick={() => setActiveView("not-selected")}
            >
              Not Selected
              <span>{notSelectedCount}</span>
            </button>
          </div>

          {!isLocked && (
            <div className="cp-pref-save-actions">
              {saveMessage?.text && (
                <span
                  className={`cp-save-message cp-save-message-${saveMessage.type}`}
                  role="status"
                >
                  {saveMessage.text}
                </span>
              )}
              <button type="button" className="cp-save-btn cp-pref-save-btn" onClick={onSave}>
                Save Preferences
              </button>
            </div>
          )}
        </div>

        <div className="cp-pref-grid-wrapper">
          <table className="cp-pref-grid" aria-label="Course preferences">
            <thead>
              <tr>
                <th className="cp-pref-grid-th cp-pref-grid-col-code">Code</th>
                <th className="cp-pref-grid-th cp-pref-grid-col-name">Course Name</th>
                {RANKING_OPTIONS.map((n) => {
                  const label = nqLabel(n);
                  return (
                    <th
                      key={n}
                      className={`cp-pref-grid-th cp-pref-grid-col-rank cp-pref-grid-rank-hd-${n}`}
                    >
                      <span className="cp-pref-rank-hd-num">{n === 0 ? "0" : n}</span>
                      {label && <span className="cp-pref-rank-hd-label">{label}</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ course, currentRank, code }) => (
                <tr
                  key={`${course.subject}-${course.courseName}`}
                  className={`cp-pref-grid-row${currentRank ? " cp-pref-grid-row-ranked" : ""}`}
                >
                  <td className="cp-pref-grid-col-code">
                    <span className="cp-course-code-badge">{code || "-"}</span>
                  </td>
                  <td className="cp-pref-grid-col-name">
                    <span className="cp-pref-course-label">
                      {course.subject}&nbsp;{course.courseName}
                    </span>
                  </td>
                  {RANKING_OPTIONS.map((n) => {
                    const isSelected = currentRank === n;
                    const displayLabel = n === 0 ? "NQ" : n;
                    return (
                      <td
                        key={n}
                        className={`cp-pref-grid-col-rank cp-pref-grid-rank-cell-${n}${isSelected ? " cp-pref-grid-rank-cell-active" : ""}`}
                      >
                        {isLocked ? (
                          <span
                            className={`cp-pref-dot${isSelected ? ` cp-pref-dot-filled cp-pref-dot-${n}` : " cp-pref-dot-empty"}`}
                            aria-label={isSelected ? RANKING_LABELS[n] : ""}
                          >
                            {isSelected ? displayLabel : ""}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={`cp-pref-dot cp-pref-dot-btn${isSelected ? ` cp-pref-dot-filled cp-pref-dot-${n}` : " cp-pref-dot-empty"}`}
                            onClick={() => handleRankClick(course, n)}
                            aria-pressed={isSelected}
                            aria-label={`${course.subject} ${course.courseName}: ${RANKING_LABELS[n]}${isSelected ? " (click to clear)" : ""}`}
                            title={
                              isSelected
                                ? `${RANKING_LABELS[n]} - click to clear`
                                : RANKING_LABELS[n]
                            }
                          >
                            {isSelected ? displayLabel : ""}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRows.length === 0 && (
            <div className="cp-pref-empty" role="status">
              {activeView === "selected"
                ? "No courses have been selected yet."
                : activeView === "not-qualified"
                  ? "No courses marked as Not Qualified."
                  : "All catalog courses have a preference set."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
