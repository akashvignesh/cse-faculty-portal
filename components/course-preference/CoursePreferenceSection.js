import { useMemo, useState } from "react";
import { RANKING_OPTIONS, RANKING_LABELS, genId } from "./coursePreferenceUtils";
import { courseCatalogMockData } from "../../data/courseCatalogMockData";

function buildPrefLookup(preferences) {
  return Object.fromEntries(preferences.map((p) => [p.courseName, p]));
}

function deriveCourseCode(entry) {
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
}) {
  const [activeView, setActiveView] = useState("selected");
  const [retainedNotSelectedCourses, setRetainedNotSelectedCourses] = useState([]);
  const prefLookup = buildPrefLookup(preferences);
  const retainedNotSelectedSet = useMemo(
    () => new Set(retainedNotSelectedCourses),
    [retainedNotSelectedCourses]
  );
  const courseRows = useMemo(
    () =>
      courseCatalogMockData.map((course) => {
        const pref = prefLookup[course.courseName];
        return {
          course,
          currentRank: pref?.ranking ?? null,
          code: deriveCourseCode(course),
        };
      }),
    [prefLookup]
  );
  const selectedRows = courseRows.filter((row) => row.currentRank);
  const visibleRows =
    activeView === "selected"
      ? selectedRows
      : courseRows.filter(
          (row) => !row.currentRank || retainedNotSelectedSet.has(row.course.courseName)
        );
  const rankedCount = preferences.length;
  const notSelectedCount = courseCatalogMockData.length - rankedCount;

  function handleRankClick(course, rank) {
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
          preferences.map((p) =>
            p.courseName === course.courseName ? { ...p, ranking: rank } : p
          )
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
              aria-selected={activeView === "selected"}
              className={`cp-pref-view-tab${activeView === "selected" ? " is-active" : ""}`}
              onClick={() => setActiveView("selected")}
            >
              Selected
              <span>{rankedCount}</span>
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
                {RANKING_OPTIONS.map((n) => (
                  <th
                    key={n}
                    className={`cp-pref-grid-th cp-pref-grid-col-rank cp-pref-grid-rank-hd-${n}`}
                  >
                    <span className="cp-pref-rank-hd-num">{n}</span>
                    {n === 1 && <span className="cp-pref-rank-hd-label">Least</span>}
                    {n === 5 && <span className="cp-pref-rank-hd-label">Most</span>}
                  </th>
                ))}
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
                    return (
                      <td
                        key={n}
                        className={`cp-pref-grid-col-rank cp-pref-grid-rank-cell-${n}${isSelected ? " cp-pref-grid-rank-cell-active" : ""}`}
                      >
                        {isLocked ? (
                          <span
                            className={`cp-pref-dot${isSelected ? ` cp-pref-dot-filled cp-pref-dot-${n}` : " cp-pref-dot-empty"}`}
                            aria-label={isSelected ? `Ranked ${n}` : ""}
                          >
                            {isSelected ? n : ""}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={`cp-pref-dot cp-pref-dot-btn${isSelected ? ` cp-pref-dot-filled cp-pref-dot-${n}` : " cp-pref-dot-empty"}`}
                            onClick={() => handleRankClick(course, n)}
                            aria-pressed={isSelected}
                            aria-label={`${course.subject} ${course.courseName}: rank ${n}${isSelected ? " (click to clear)" : ""}`}
                            title={isSelected ? `${RANKING_LABELS[n]} - click to clear` : RANKING_LABELS[n]}
                          >
                            {isSelected ? n : ""}
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
                : "All catalog courses have a selected preference."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
