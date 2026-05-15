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

/**
 * Course preference grid — shows every catalog course as a row.
 * Columns 1–5 are radio-style toggle buttons; click again to deselect.
 */
export default function CoursePreferenceSection({ preferences, isLocked, onChange }) {
  const prefLookup = buildPrefLookup(preferences);

  function handleRankClick(course, rank) {
    const existing = prefLookup[course.courseName];
    if (existing) {
      if (existing.ranking === rank) {
        // deselect
        onChange(preferences.filter((p) => p.courseName !== course.courseName));
      } else {
        // change rank
        onChange(
          preferences.map((p) =>
            p.courseName === course.courseName ? { ...p, ranking: rank } : p
          )
        );
      }
    } else {
      // new preference
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

  const rankedCount = preferences.length;

  return (
    <div className="cp-section-card">
      <div className="cp-section-header">
        <h3 className="cp-section-title">Course Preferences</h3>
        <div className="cp-section-header-right">
          {rankedCount > 0 && (
            <span className="cp-pref-count-badge">{rankedCount} ranked</span>
          )}
          {isLocked && <span className="cp-locked-badge">Read-only</span>}
        </div>
      </div>

      <div className="cp-section-body">
        <p className="cp-pref-instructions">
          Click a number to set your preference ranking for each course (
          <strong>1 = least preferred</strong>, <strong>5 = most preferred</strong>).
          Click the same number again to clear. Leave courses unselected if you have
          no preference.
        </p>

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
              {courseCatalogMockData.map((course) => {
                const pref = prefLookup[course.courseName];
                const currentRank = pref?.ranking ?? null;
                const code = deriveCourseCode(course);
                return (
                  <tr
                    key={`${course.subject}-${course.courseName}`}
                    className={`cp-pref-grid-row${currentRank ? " cp-pref-grid-row-ranked" : ""}`}
                  >
                    <td className="cp-pref-grid-col-code">
                      <span className="cp-course-code-badge">{code || "—"}</span>
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
                              title={isSelected ? `${RANKING_LABELS[n]} — click to clear` : RANKING_LABELS[n]}
                            >
                              {isSelected ? n : ""}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
