import Link from "next/link";
import PortalChrome from "../components/PortalChrome";

export default function SignOutPage() {
  return (
    <PortalChrome
      activeKey="signout"
      title="Sign Out | CSE Portal"
      pageTitle="Sign Out"
      pageSubtitle="Faculty View"
      pageDesc="You have been signed out of the CSE portal (demo view)."
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Sign Out", href: "/signout" },
      ]}
    >
      <div className="roster-card">
        <div className="roster-card-title">Session Ended</div>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          This is a sample sign out screen. Click below to return to the roster view.
        </p>
        <p style={{ marginTop: 12 }}>
          <Link href="/">Return to CSE Roster</Link>
        </p>
      </div>
    </PortalChrome>
  );
}
