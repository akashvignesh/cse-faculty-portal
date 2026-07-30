"use client";

import { displayValue } from "@/lib/format";
import type { Faculty } from "@/types/faculty";
import FacultyPhoto from "./FacultyPhoto";
import type { ProfileEditState } from "./useProfileEdit";

export default function FacultySummaryCard({
  faculty,
  profileEdit,
  canEditProfile,
}: {
  faculty: Faculty;
  profileEdit?: ProfileEditState;
  canEditProfile?: boolean;
}) {
  const showControls = Boolean(canEditProfile && profileEdit);

  return (
    <section className="faculty-summary-card">
      <div
        className="faculty-summary-card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2>{faculty.name}</h2>
          <p>{displayValue(faculty.titleLine)}</p>
        </div>

        {showControls && profileEdit && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {!profileEdit.isEditing ? (
                <button
                  type="button"
                  className="cp-save-btn"
                  onClick={profileEdit.start}
                  disabled={profileEdit.loading}
                >
                  {profileEdit.loading ? "Loading…" : "Edit Profile"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="cp-save-btn"
                    onClick={profileEdit.apply}
                    disabled={profileEdit.saving || !profileEdit.isDirty}
                  >
                    {profileEdit.saving ? "Saving…" : "Apply"}
                  </button>
                  <button
                    type="button"
                    className="cp-save-btn"
                    style={{ background: "#6b7785" }}
                    onClick={profileEdit.cancel}
                    disabled={profileEdit.saving}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
            {profileEdit.isEditing && (
              <span className="faculty-table-status" role="status" style={{ margin: 0 }}>
                Click a pencil to edit a field.
              </span>
            )}
            {profileEdit.error && (
              <span className="cp-save-message cp-save-message-error" role="alert">
                {profileEdit.error}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="faculty-summary-card-body">
        <div className="faculty-summary-photo-block">
          <FacultyPhoto routeId={faculty.personNumber || faculty.userid} name={faculty.name} />
          <div className="faculty-summary-photo-caption">{faculty.name}</div>
        </div>

        <div className="faculty-summary-contact">
          <h3>Contact</h3>
          <div className="faculty-summary-contact-list">
            <p>
              Official:{" "}
              <a href={`mailto:${faculty.primaryEmail}`}>{displayValue(faculty.primaryEmail)}</a>
            </p>
            <p>
              Personal:{" "}
              <a href={`mailto:${faculty.secondaryEmail}`}>{displayValue(faculty.secondaryEmail)}</a>
            </p>
            <p>Phone: {displayValue(faculty.phone)}</p>
          </div>
        </div>

        <div className="faculty-summary-contact">
          <h3>Physical Addresses</h3>
          <div className="faculty-summary-contact-list">
            {faculty.physicalAddressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {faculty.mailingAddressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="faculty-summary-contact">
          <h3>Social Media</h3>
          <div className="faculty-summary-contact-list">
            {faculty.socialLinks.length > 0 ? (
              faculty.socialLinks.map((link) => (
                <a href={`https://${link}`} key={link} target="_blank" rel="noreferrer">
                  {link}
                </a>
              ))
            ) : (
              <p>Not available</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
