import {
  getDefaultLoad,
  getRoleAdjustment,
  getAdjustedLoad,
  getTotalRequestedLoad,
  validateLoadInputs,
  MAX_LOAD_PER_SEMESTER,
  SUMMER_COUNTS_TOWARD_LOAD,
} from "./coursePreferenceUtils";

const SEMESTERS = [
  { key: "summer", label: "Summer" },
  { key: "fall", label: "Fall" },
  { key: "spring", label: "Spring" },
];

/**
 * Input section where faculty request their teaching load per semester.
 * Shows dynamic validation feedback and total load calculation.
 */
export default function SemesterLoadSection({ yearData, isLocked, onUpdateYearData }) {
  const { facultyType, roles, requestedLoad } = yearData;
  const defaultLoad = getDefaultLoad(facultyType);
  const roleAdjustment = getRoleAdjustment(roles);
  const adjustedLoad = getAdjustedLoad(defaultLoad, roleAdjustment);
  const total = getTotalRequestedLoad(requestedLoad, facultyType);
  const validationMsgs = validateLoadInputs(requestedLoad, adjustedLoad, facultyType);
  const countsSummer = SUMMER_COUNTS_TOWARD_LOAD[facultyType] ?? false;

  const fieldErrors = {};
  for (const msg of validationMsgs) {
    if (msg.field !== "total") fieldErrors[msg.field] = msg;
  }
  const totalMsg = validationMsgs.find((m) => m.field === "total");

  function handleLoadChange(semKey, rawValue) {
    const parsed = parseInt(rawValue, 10);
    const value = isNaN(parsed) ? 0 : parsed;
    onUpdateYearData((prev) => ({
      ...prev,
      requestedLoad: { ...prev.requestedLoad, [semKey]: value },
    }));
  }

  return (
    <div className="cp-section-card">
      <div className="cp-section-header">
        <h3 className="cp-section-title">Requested Semester Load</h3>
        {isLocked && <span className="cp-locked-badge">Read-only</span>}
      </div>

      <div className="cp-section-body">
        <div className="cp-sem-load-grid">
          {SEMESTERS.map(({ key, label }) => {
            const fieldMsg = fieldErrors[key];
            const isSummerExcluded = key === "summer" && !countsSummer;
            return (
              <div
                key={key}
                className={`cp-sem-load-item${fieldMsg ? " cp-sem-load-item-error" : ""}`}
              >
                <label className="cp-sem-load-label" htmlFor={`load-${key}`}>
                  {label}
                  {isSummerExcluded && (
                    <span className="cp-sem-excluded-note"> (not counted toward load)</span>
                  )}
                </label>
                {isLocked ? (
                  <span className="cp-sem-load-value">{requestedLoad[key] ?? 0}</span>
                ) : (
                  <input
                    id={`load-${key}`}
                    type="number"
                    className={`cp-sem-load-input${fieldMsg ? " cp-input-error" : ""}`}
                    min={0}
                    max={MAX_LOAD_PER_SEMESTER}
                    value={requestedLoad[key] ?? 0}
                    onChange={(e) => handleLoadChange(key, e.target.value)}
                    aria-describedby={fieldMsg ? `load-${key}-msg` : undefined}
                  />
                )}
                {fieldMsg && (
                  <span
                    id={`load-${key}-msg`}
                    className={`cp-field-msg cp-field-msg-${fieldMsg.type}`}
                    role="alert"
                  >
                    {fieldMsg.message}
                  </span>
                )}
              </div>
            );
          })}

          <div className="cp-sem-load-total">
            <span className="cp-sem-load-total-label">
              Total{!countsSummer ? " (excl. Summer)" : ""}
            </span>
            <strong className={`cp-sem-load-total-value${totalMsg ? (totalMsg.type === "error" ? " is-error" : " is-warning") : " is-ok"}`}>
              {total}
              <span className="cp-sem-load-total-expected"> / {adjustedLoad} expected</span>
            </strong>
          </div>
        </div>

        {totalMsg && (
          <div
            className={`cp-validation-banner cp-validation-banner-${totalMsg.type}`}
            role="alert"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
              {totalMsg.type === "error" ? (
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 4.25a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0v-3Zm.75 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
              ) : (
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566ZM8 5a.905.905 0 0 1 .9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5Zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
              )}
            </svg>
            {totalMsg.message}
          </div>
        )}
      </div>
    </div>
  );
}
