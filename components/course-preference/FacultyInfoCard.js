import {
  ALL_FACULTY_TYPES,
  ALL_ROLES,
  getComputedAnnualLoad,
  getDefaultSemesterDistribution,
  buildDefaultSemesterPlan,
} from "./coursePreferenceUtils";

/**
 * Displays and (when unlocked) allows editing of faculty type and roles.
 * Changing either auto-resets the semester plan to match the new load.
 */
export default function FacultyInfoCard({ faculty, yearData, isLocked, onUpdateYearData }) {
  const annualLoad = getComputedAnnualLoad(yearData.facultyType, yearData.roles);

  function handleTypeChange(e) {
    const newType = e.target.value;
    onUpdateYearData((prev) => {
      const load = getComputedAnnualLoad(newType, prev.roles);
      const requestedLoad = getDefaultSemesterDistribution(load);
      return {
        ...prev,
        facultyType: newType,
        requestedLoad,
        semesterPlan: buildDefaultSemesterPlan(requestedLoad),
      };
    });
  }

  function handleRoleToggle(role) {
    onUpdateYearData((prev) => {
      const newRoles = prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];
      const load = getComputedAnnualLoad(prev.facultyType, newRoles);
      const requestedLoad = getDefaultSemesterDistribution(load);
      return {
        ...prev,
        roles: newRoles,
        requestedLoad,
        semesterPlan: buildDefaultSemesterPlan(requestedLoad),
      };
    });
  }

  const loadLabel =
    annualLoad === 0
      ? "Full Release (0 courses / year)"
      : `${annualLoad} course${annualLoad !== 1 ? "s" : ""} / year`;

  return (
    <div className="cp-section-card">
      <div className="cp-section-header">
        <h3 className="cp-section-title">Faculty Information</h3>
        {isLocked && <span className="cp-locked-badge">Read-only</span>}
      </div>

      <div className="cp-section-body">
        <div className="cp-info-grid">

          <div className="cp-info-item">
            <span className="cp-info-label">Faculty Name</span>
            <span className="cp-info-value cp-info-value-strong">{faculty.name}</span>
          </div>

          <div className="cp-info-item">
            <span className="cp-info-label">Faculty Type</span>
            {isLocked ? (
              <span className="cp-info-value">{yearData.facultyType}</span>
            ) : (
              <select
                className="cp-select cp-info-select"
                value={yearData.facultyType}
                onChange={handleTypeChange}
                aria-label="Faculty type"
              >
                {ALL_FACULTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>

          <div className="cp-info-item cp-info-item-full">
            <span className="cp-info-label">Faculty Roles</span>
            {isLocked ? (
              <span className="cp-info-value">
                {yearData.roles.length > 0 ? yearData.roles.join(", ") : "None"}
              </span>
            ) : (
              <div className="cp-roles-checklist">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="cp-role-checkbox-label">
                    <input
                      type="checkbox"
                      className="cp-role-checkbox"
                      checked={yearData.roles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                    />
                    <span>{role}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="cp-info-item">
            <span className="cp-info-label">Default Teaching Load</span>
            <span className={`cp-info-value${annualLoad === 0 ? "" : " cp-info-value-strong"}`}>
              {annualLoad === 0
                ? <span className="cp-full-release-tag">Full Release (0 courses)</span>
                : loadLabel}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
