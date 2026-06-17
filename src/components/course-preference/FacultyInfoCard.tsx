import type { Faculty, YearData } from "@/types/faculty";
import { ALL_ROLES, getComputedAnnualLoad } from "./coursePreferenceUtils";

export interface FacultyInfoCardProps {
  faculty: Faculty;
  yearData: YearData;
  isLocked: boolean;
  /** When provided (and not locked), roles become an editable multi-select. */
  onToggleRole?: (role: string) => void;
}

/**
 * Displays faculty type and roles. Roles are editable (multi-select) when the
 * year is unlocked and an onToggleRole handler is supplied.
 */
export default function FacultyInfoCard({
  faculty,
  yearData,
  isLocked,
  onToggleRole,
}: FacultyInfoCardProps) {
  const annualLoad = getComputedAnnualLoad(yearData.facultyType, yearData.roles);
  const rolesEditable = !isLocked && typeof onToggleRole === "function";

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
            <span className="cp-info-value cp-info-value-strong">{yearData.facultyType}</span>
          </div>

          <div className="cp-info-item cp-info-item-full">
            <span className="cp-info-label">Faculty Roles</span>
            {rolesEditable ? (
              <div className="cp-role-options" role="group" aria-label="Faculty roles">
                {ALL_ROLES.map((role) => {
                  const checked = yearData.roles.includes(role);
                  return (
                    <label
                      key={role}
                      className={`cp-role-option${checked ? " is-checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleRole?.(role)}
                      />
                      <span>{role}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <span className="cp-info-value">
                {yearData.roles.length > 0 ? yearData.roles.join(", ") : "None"}
              </span>
            )}
          </div>

          <div className="cp-info-item">
            <span className="cp-info-label">Default Teaching Load</span>
            <span className={`cp-info-value${annualLoad === 0 ? "" : " cp-info-value-strong"}`}>
              {annualLoad === 0 ? (
                <span className="cp-full-release-tag">Full Release (0 courses)</span>
              ) : (
                loadLabel
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
