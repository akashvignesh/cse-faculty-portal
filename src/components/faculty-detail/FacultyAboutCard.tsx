"use client";

import { getFirstName } from "@/lib/format";
import type { Faculty } from "@/types/faculty";
import EditableField from "./EditableField";
import type { ProfileEditState } from "./useProfileEdit";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  border: "1px solid #b9c2cc",
  borderRadius: 4,
  font: "inherit",
};

function formatDraftAddress(a: {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): string {
  const cityLine = [a.city, [a.state, a.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return [a.line1, a.line2, cityLine, a.country].filter(Boolean).join(", ");
}

export default function FacultyAboutCard({
  faculty,
  profileEdit,
}: {
  faculty: Faculty;
  profileEdit?: ProfileEditState;
}) {
  const editing = Boolean(profileEdit?.isEditing && profileEdit.draft);
  const draft = profileEdit?.draft ?? null;

  // Biography is entirely upstream-owned → always read-only, no pencils.
  const biographyFields = [
    { label: "Person Number", value: faculty.personNumber },
    { label: "Full Name", value: faculty.name },
    { label: "Userid", value: faculty.userid },
    { label: "Pronouns", value: faculty.pronouns },
    { label: "Primary Appointment", value: faculty.primaryAppointment },
    { label: "Standard Load", value: faculty.standardLoad },
    { label: "Next Promotion Date", value: faculty.nextPromotionDate },
    { label: "Backup Faculty Person Number", value: faculty.backupFacultyPersonNumber },
  ];

  return (
    <section className="faculty-about-card">
      <div className="faculty-about-card-header">
        <h2>About {getFirstName(faculty.name)}</h2>
      </div>

      <div className="faculty-about-grid">
        <div className="faculty-about-panel">
          <div className="faculty-about-panel-title">Biography</div>
          <div className="faculty-about-panel-grid">
            {biographyFields.map((field) => (
              <EditableField
                key={field.label}
                label={field.label}
                value={field.value}
                editing={editing}
                editable={false}
              />
            ))}
          </div>
        </div>

        <div className="faculty-about-panel">
          <div className="faculty-about-panel-title">Contact &amp; Personal</div>
          <div className="faculty-about-panel-grid">
            {/* Official email is the derived @buffalo.edu address — read-only. */}
            <EditableField
              label="Official Email"
              value={faculty.primaryEmail}
              editing={editing}
              editable={false}
            />

            <EditableField
              label="Personal Email"
              value={editing && draft ? draft.personalEmail : faculty.secondaryEmail}
              editing={editing}
              editable
            >
              <input
                type="email"
                style={inputStyle}
                value={draft?.personalEmail ?? ""}
                maxLength={255}
                placeholder="name@example.com"
                aria-label="Personal email"
                onChange={(e) => profileEdit?.setEmail(e.target.value)}
              />
            </EditableField>

            <EditableField
              label="Phone"
              value={editing && draft ? draft.phone : faculty.phone}
              editing={editing}
              editable
            >
              <input
                type="tel"
                style={inputStyle}
                value={draft?.phone ?? ""}
                maxLength={50}
                placeholder="+1-716-000-0000"
                aria-label="Phone"
                onChange={(e) => profileEdit?.setPhone(e.target.value)}
              />
            </EditableField>

            {/* Campus office comes from facilities — read-only. */}
            <EditableField
              label="Official / Campus Office"
              value={faculty.campusOffice}
              editing={editing}
              editable={false}
            />

            <EditableField
              label="Personal Address"
              value={editing && draft ? formatDraftAddress(draft.address) : faculty.officeAddress}
              editing={editing}
              editable
            >
              <div style={{ display: "grid", gap: 4 }}>
                {(
                  [
                    ["line1", "Address line 1", 255],
                    ["line2", "Address line 2", 255],
                    ["city", "City", 100],
                    ["state", "State / Province", 100],
                    ["postalCode", "Postal code", 30],
                    ["country", "Country", 100],
                  ] as const
                ).map(([key, label, max]) => (
                  <input
                    key={key}
                    type="text"
                    style={inputStyle}
                    value={draft?.address[key] ?? ""}
                    maxLength={max}
                    placeholder={label}
                    aria-label={label}
                    onChange={(e) => profileEdit?.setAddressField(key, e.target.value)}
                  />
                ))}
              </div>
            </EditableField>
          </div>
        </div>
      </div>
    </section>
  );
}
