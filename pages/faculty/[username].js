import Link from "next/link";
import { useRouter } from "next/router";
import PortalChrome from "../../components/PortalChrome";
import { STUDENTS } from "../../lib/rosterData";

export default function FacultyDetailPage() {
  const router = useRouter();
  const { username } = router.query;

  const advisees = STUDENTS.filter(
    (s) => s.advisor1 === username || s.advisor2 === username
  );

  return (
    <PortalChrome
      activeKey="roster"
      title="Faculty Detail | CSE Portal"
      pageTitle="Faculty Advisor Detail"
      pageSubtitle="Faculty View"
      pageDesc="Advisor profile and assigned staffs"
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Roster", href: "/" },
      ]}
    >
      <div className="roster-card">
        <div className="roster-card-title">{username || "Faculty"}</div>

        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 10 }}>
          Assigned staffs:
        </p>

        {advisees.length > 0 ? (
          <ul style={{ marginLeft: 18, color: "var(--text-muted)", display: "grid", gap: 6 }}>
            {advisees.map((student) => (
              <li key={student.id}>
                <Link href={`/staffs/${student.userid}`}>{student.name}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            No advisees found for {username}.
          </p>
        )}

        <p style={{ marginTop: 14 }}>
          <Link href="/">Back to CSE Roster</Link>
        </p>
      </div>
    </PortalChrome>
  );
}
