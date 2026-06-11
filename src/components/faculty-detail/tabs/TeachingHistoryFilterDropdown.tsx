"use client";

export interface TeachingHistoryFilterDropdownProps {
  label: string;
  values: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  formatValue?: (value: string) => string;
}

export default function TeachingHistoryFilterDropdown({
  label,
  values,
  selectedValues,
  onToggle,
  onClear,
  formatValue = String,
}: TeachingHistoryFilterDropdownProps) {
  const selectedSet = new Set(selectedValues);
  const summaryText =
    selectedValues.length > 0
      ? `${label}: ${selectedValues.map((value) => formatValue(value)).join(", ")}`
      : `${label}: All`;

  return (
    <details className="faculty-history-filter">
      <summary className="faculty-history-filter-trigger">
        <span>{summaryText}</span>
        <span className="faculty-history-filter-caret" aria-hidden="true">
          &#9662;
        </span>
      </summary>
      <div className="faculty-history-filter-menu">
        <div className="faculty-history-filter-menu-title">{label}</div>
        {values.map((value) => {
          const normalizedValue = String(value);

          return (
            <label className="faculty-history-filter-option" key={normalizedValue}>
              <input
                type="checkbox"
                checked={selectedSet.has(normalizedValue)}
                onChange={() => onToggle(normalizedValue)}
              />
              <span>{formatValue(normalizedValue)}</span>
            </label>
          );
        })}
        {selectedValues.length > 0 ? (
          <button type="button" className="faculty-history-filter-clear" onClick={onClear}>
            Clear
          </button>
        ) : null}
      </div>
    </details>
  );
}
