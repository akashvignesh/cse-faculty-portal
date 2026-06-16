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
    { label: "Campus Office", value: faculty.campusOffice },
    { label: "Mailing Address", value: faculty.officeAddress },
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
              <div className="faculty-about-field" key={field.label}>
                <div className="faculty-about-field-label">{field.label}</div>
                <div className="faculty-about-field-value">{displayValue(field.value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
