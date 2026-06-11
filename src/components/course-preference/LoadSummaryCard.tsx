import type { YearData } from "@/types/faculty";
import {
  getAdjustedLoad,
  getDefaultLoad,
  getRoleAdjustment,
  ROLE_ADJUSTMENTS_CONFIG,
  SUMMER_COUNTS_TOWARD_LOAD,
} from "./coursePreferenceUtils";

function LoadTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`cp-load-tile${highlight ? " cp-load-tile-highlight" : ""}`}>
      <span className="cp-load-tile-label">{label}</span>
      <strong className="cp-load-tile-value">{value}</strong>
    </div>
  );
}

/**
 * Read-only card showing the load breakdown:
 * Default Load → Role Adjustments → Adjusted Load
 */
export default function LoadSummaryCard({ yearData }: { yearData: YearData }) {
  const { facultyType, roles } = yearData;
  const defaultLoad = getDefaultLoad(facultyType);
  const roleAdjustment = getRoleAdjustment(roles);
  const adjustedLoad = getAdjustedLoad(defaultLoad, roleAdjustment);
  const countsSummer = SUMMER_COUNTS_TOWARD_LOAD[facultyType] ?? false;

  const roleAdjConfigs = ROLE_ADJUSTMENTS_CONFIG.filter((r) => roles.includes(r.role));

  return (
    <div className="cp-section-card">
      <div className="cp-section-header">
        <h3 className="cp-section-title">Teaching Load Summary</h3>
      </div>

      <div className="cp-section-body">
        <div className="cp-load-tiles">
          <LoadTile label="Default Annual Load" value={`${defaultLoad} courses`} />

          <div className="cp-load-arrow" aria-hidden="true">
            →
          </div>

          <div className="cp-load-tile cp-load-tile-adjustments">
            <span className="cp-load-tile-label">Role Adjustments</span>
            {roleAdjustment === "FULL_RELEASE" ? (
              <strong className="cp-load-tile-value cp-load-release-value">Full Release</strong>
            ) : roleAdjustment === 0 ? (
              <strong className="cp-load-tile-value cp-load-none-value">None</strong>
            ) : (
              <strong className="cp-load-tile-value cp-load-reduction-value">
                − {roleAdjustment} course{roleAdjustment !== 1 ? "s" : ""}
              </strong>
            )}
            {roleAdjConfigs.length > 0 && (
              <ul className="cp-load-role-list">
                {roleAdjConfigs.map((r) => (
                  <li key={r.role}>
                    {r.role}:{" "}
                    {r.adjustment === "FULL_RELEASE" ? "Full Release" : `−${r.adjustment}`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cp-load-arrow" aria-hidden="true">
            →
          </div>

          <LoadTile
            label="Final Adjusted Load"
            value={adjustedLoad === 0 ? "0 courses (Full Release)" : `${adjustedLoad} courses`}
            highlight
          />
        </div>

        <p className="cp-load-note">
          {countsSummer
            ? "Summer courses count toward your annual teaching load."
            : "Summer courses do not count toward your annual teaching load."}
        </p>
      </div>
    </div>
  );
}
