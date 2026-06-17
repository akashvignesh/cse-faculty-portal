import { displayValue } from "@/lib/format";
import type { Faculty } from "@/types/faculty";
import FacultyPhoto from "./FacultyPhoto";

export default function FacultySummaryCard({ faculty }: { faculty: Faculty }) {
  return (
    <section className="faculty-summary-card">
      <div className="faculty-summary-card-header">
        <h2>{faculty.name}</h2>
        <p>{displayValue(faculty.titleLine)}</p>
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
              Official: <a href={`mailto:${faculty.primaryEmail}`}>{displayValue(faculty.primaryEmail)}</a>
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
