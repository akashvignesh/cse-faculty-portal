"use client";

import type { Faculty } from "@/types/faculty";
import type { ProfileEditState } from "../useProfileEdit";

export default function ResearchTab({
  faculty,
  profileEdit,
}: {
  faculty: Faculty;
  profileEdit?: ProfileEditState;
}) {
  const draft = profileEdit?.isEditing ? profileEdit.draft : null;

  if (draft) {
    return (
      <div className="faculty-secondary-section">
        <div className="faculty-preference-heading">
          <h2>Research Area</h2>
        </div>
        <p className="faculty-table-status" role="note">
          Select this faculty member&apos;s research areas.
        </p>
        <div className="cp-role-options">
          {draft.researchAreaOptions.map((option) => {
            const checked = draft.researchAreaIds.includes(option.researchAreaId);
            return (
              <label
                key={option.researchAreaId}
                className={`cp-role-option${checked ? " is-checked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => profileEdit?.toggleResearchArea(option.researchAreaId)}
                />
                <span>{option.areaName}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Research Area</h2>
      </div>
      <div className="faculty-chip-list">
        {faculty.researchTopics.length > 0 ? (
          faculty.researchTopics.map((topic) => (
            <span className="faculty-chip" key={topic}>
              {topic}
            </span>
          ))
        ) : (
          <div className="faculty-table-status" role="status">
            No research area data is available for this faculty record.
          </div>
        )}
      </div>
    </div>
  );
}
