function LockIcon() {
  return (
    <svg
      className="cp-year-lock-icon"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11.5 7V5.5a3.5 3.5 0 0 0-7 0V7H3v7.5h10V7h-1.5ZM6 5.5a2 2 0 1 1 4 0V7H6V5.5Z" />
    </svg>
  );
}

/**
 * Displays academic year pills and a "Create New Year" button.
 * Locked years show a lock icon and a "Read-only" badge.
 */
export default function AcademicYearSelector({
  years,
  selectedYear,
  onSelectYear,
}) {
  return (
    <div className="cp-year-selector">
      <div className="cp-year-selector-header">
        <span className="cp-year-selector-title">Academic Year</span>
      </div>

      <div className="cp-year-pills" role="tablist" aria-label="Select academic year">
        {years.map((yr) => {
          const isActive = yr.year === selectedYear;
          return (
            <button
              key={yr.year}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={[
                "cp-year-pill",
                isActive ? "is-active" : "",
                yr.locked ? "is-locked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectYear(yr.year)}
              aria-label={`${yr.year}${yr.locked ? " (read-only)" : ""}`}
            >
              {yr.locked && <LockIcon />}
              <span>{yr.year}</span>
              {yr.locked && (
                <span className="cp-year-readonly-badge" aria-hidden="true">
                  Read-only
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
