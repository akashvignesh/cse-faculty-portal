import { displayValue, getInitials } from "@/lib/format";
import type { Faculty } from "@/types/faculty";

export default function FacultySummaryCard({ faculty }: { faculty: Faculty }) {
  return (
    <section className="faculty-summary-card">
      <div className="faculty-summary-card-header">
        <h2>{faculty.name}</h2>
        <p>{displayValue(faculty.titleLine)}</p>
      </div>

      <div className="faculty-summary-card-body">
        <div className="faculty-summary-photo-block">
          <div className="faculty-summary-photo">{getInitials(faculty.name)}</div>
          <div className="faculty-summary-photo-caption">{faculty.name}</div>
        </div>

        <div className="faculty-summary-contact">
          <h3>Email Addresses</h3>
          <div className="faculty-summary-contact-list">
            <a href={`mailto:${faculty.primaryEmail}`}>{displayValue(faculty.primaryEmail)}</a>
            <a href={`mailto:${faculty.secondaryEmail}`}>{displayValue(faculty.secondaryEmail)}</a>
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
