import { displayValue, getFirstName } from "@/lib/format";
import type { Faculty } from "@/types/faculty";

export default function FacultyAboutCard({ faculty }: { faculty: Faculty }) {
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

  const contactFields = [
    { label: "Official Email", value: faculty.primaryEmail },
    { label: "Personal Email", value: faculty.secondaryEmail },
    { label: "Phone", value: faculty.phone },
    { label: "Official / Campus Office", value: faculty.campusOffice },
    { label: "Personal Address", value: faculty.officeAddress },
  ];

  const panels = [
    { title: "Biography", fields: biographyFields },
    { title: "Contact & Personal", fields: contactFields },
  ];

  return (
    <section className="faculty-about-card">
      <div className="faculty-about-card-header">
        <h2>About {getFirstName(faculty.name)}</h2>
      </div>

      <div className="faculty-about-grid">
        {panels.map((panel) => (
          <div className="faculty-about-panel" key={panel.title}>
            <div className="faculty-about-panel-title">{panel.title}</div>
            <div className="faculty-about-panel-grid">
              {panel.fields.map((field) => (
                <div className="faculty-about-field" key={field.label}>
                  <div className="faculty-about-field-label">{field.label}</div>
                  <div className="faculty-about-field-value">{displayValue(field.value)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
