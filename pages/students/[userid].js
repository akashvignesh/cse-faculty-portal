import Link from "next/link";
import { useRouter } from "next/router";
import PortalChrome from "../../components/PortalChrome";
import { STUDENTS } from "../../lib/rosterData";

function buildProfile(student) {
  const fullName = student?.name || "Staff";
  const parts = fullName.split(",");
  const displayName = parts.length > 1 ? `${parts[1].trim()} ${parts[0].trim()}` : fullName;

  return {
    displayName,
    emailPrimary: `${student?.userid}@buffalo.edu`,
    emailSecondary: `${student?.userid}95@gmail.com`,
    officeAddress: student?.office || "DAVIS 300",
    cityAddress: "Amherst, NY 14260-2500 USA",
    homeAddress: "41/861, Sankarapuram, Kadapa, Kadapa 516002 IND",
    social: "linkedin.com/in/sample-student",
    personNumber: String(5040000 + (student?.id || 1) * 137),
    pronouns: "He/Him/His",
    degree: "MS Computer Science",
    primaryAppointment: student?.funding || "Research Project Assistant",
    programStatus: "Active in Program",
    enrolledIndicator: "Enrolled",
    startInstitution: "Spring 2023",
    startMajor: "Fall 2025",
    startProgram: "Fall 2025",
    originalCitizenship: "India",
    citizenshipCountry: "India",
    citizenship: "Alien Temporary",
    cumulativeGpa: "4.00",
    cumulativeCreditsEarned: "48.00",
    cumulativeCreditsAttempted: "48.00",
    researchTopics: "Distributed systems, AI agents, and secure systems",
    graduationApplyStatus: "Unknown",
    expectedGraduationTerm: "No Expected Graduation Term",
  };
}

export default function StudentDetailPage() {
  const router = useRouter();
  const { userid } = router.query;
  const student = STUDENTS.find((s) => s.userid === userid);
  const profile = student ? buildProfile(student) : null;

  return (
    <PortalChrome
      activeKey="roster"
      title="Staff Detail | CSE Portal"
      pageTitle="CSE Portal"
      pageSubtitle="Faculty View"
      pageDesc=""
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Manager", href: "/manager" },
      ]}
    >
      {student && profile ? (
        <>
          <section className="student-card">
            <div className="student-card-header">
              <h2>{profile.displayName}</h2>
            </div>

            <div className="student-card-body">
              <div>
                <img
                  src={`https://i.pravatar.cc/120?u=${student.userid}`}
                  alt={profile.displayName}
                  className="student-photo-large"
                />
                <div className="student-photo-caption">{profile.displayName}</div>
              </div>

              <div className="contact-block">
                <h3>✉ Email Addresses</h3>
                <a href={`mailto:${profile.emailPrimary}`}>{profile.emailPrimary}</a>
                <a href={`mailto:${profile.emailSecondary}`}>{profile.emailSecondary}</a>
              </div>

              <div className="contact-block">
                <h3>📍 Physical Addresses</h3>
                <p>{profile.officeAddress}</p>
                <p>{profile.cityAddress}</p>
                <p>{profile.homeAddress}</p>
              </div>

              <div className="contact-block">
                <h3>🌐 Social Media</h3>
                <a href={`https://${profile.social}`} target="_blank" rel="noreferrer">
                  {profile.social}
                </a>
                <p style={{ marginTop: 8 }}>
                  Advisor: <Link href={`/faculty/${student.advisor1}`}>{student.advisor1}</Link>
                </p>
              </div>
            </div>
          </section>

          <section className="student-card">
            <div className="student-card-header about-header">
              <h2>🛢 About {partsFromName(student.name).firstName}</h2>
            </div>

            <div className="about-grid">
              <div className="about-panel">
                <div className="about-panel-title">👤 Biography</div>
                <div className="bio-grid">
                  <div>Name</div><div>{profile.displayName}</div>
                  <div>Userid</div><div>{student.userid}</div>
                  <div>Person Number</div><div>{profile.personNumber}</div>
                  <div>Pronouns</div><div>{profile.pronouns}</div>
                  <div>Highest Earned Degree</div><div>{profile.degree}</div>
                  <div>Primary Appointment</div><div>{profile.primaryAppointment}</div>
                  <div>Program Status</div><div>{profile.programStatus}</div>
                  <div>Enrolled Indicator</div><div>{profile.enrolledIndicator}</div>
                  <div>Start Term For Institution</div><div>{profile.startInstitution}</div>
                  <div>Start Term For Major</div><div>{profile.startMajor}</div>
                  <div>Start Term For Program</div><div>{profile.startProgram}</div>
                  <div>Original Citizenship Country</div><div>{profile.originalCitizenship}</div>
                  <div>Citizenship Country</div><div>{profile.citizenshipCountry}</div>
                  <div>Citizenship</div><div>{profile.citizenship}</div>
                  <div>Cumulative GPA</div><div>{profile.cumulativeGpa}</div>
                  <div>Cumulative Credits Earned</div><div>{profile.cumulativeCreditsEarned}</div>
                  <div>Cumulative Credits Attempted</div><div>{profile.cumulativeCreditsAttempted}</div>
                </div>
              </div>

              <div className="about-panel">
                <div className="about-panel-title">⚗ Research</div>
                <div className="bio-grid compact-grid">
                  <div>Research Topics</div><div>{profile.researchTopics}</div>
                </div>

                <div className="about-panel-title section-gap">🎓 Graduation</div>
                <div className="bio-grid compact-grid">
                  <div>Graduation Apply Status</div><div>{profile.graduationApplyStatus}</div>
                  <div>Expected Graduation Term</div><div>{profile.expectedGraduationTerm}</div>
                </div>
              </div>
            </div>
          </section>

          <p style={{ marginTop: 14 }}>
            <Link href="/">Back to CSE Roster</Link>
          </p>
        </>
      ) : (
        <div className="roster-card">
          <div className="roster-card-title">Staff Not Found</div>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            No staff found for userid: {userid}
          </p>
          <p style={{ marginTop: 14 }}>
            <Link href="/">Back to CSE Roster</Link>
          </p>
        </div>
      )}
    </PortalChrome>
  );
}

function partsFromName(name) {
  const parts = name.split(",");
  if (parts.length < 2) {
    return { firstName: name.split(" ")[0] || name };
  }

  const first = parts[1].trim().split(" ")[0] || parts[1].trim();
  return { firstName: first };
}
