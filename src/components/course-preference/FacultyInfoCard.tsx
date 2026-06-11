import type { Faculty, YearData } from "@/types/faculty";
import { getComputedAnnualLoad } from "./coursePreferenceUtils";

export interface FacultyInfoCardProps {
  faculty: Faculty;
  yearData: YearData;
  isLocked: boolean;
}

/**
 * Displays faculty type and roles supplied by faculty/backend data.
 */
export default function FacultyInfoCard({ faculty, yearData, isLocked }: FacultyInfoCardProps) {
  const annualLoad = getComputedAnnualLoad(yearData.facultyType, yearData.roles);

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
            <span className="cp-info-value">
              {yearData.roles.length > 0 ? yearData.roles.join(", ") : "None"}
            </span>
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
