import Link from "next/link";

export default function FacultyPortalHeader() {
  return (
    <header className="portal-header" aria-label="CSE Faculty Portal branding">
      <div className="portal-brand-lockup">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/Department-of-Computer-Science-and-Engineering-RGB-Blue-Gray.png"
          alt="University at Buffalo Department of Computer Science and Engineering"
          className="portal-brand-image"
        />
      </div>

      <div className="portal-topbar" role="presentation">
        <Link className="portal-topbar-link" href="/" aria-label="CSE Faculty Portal home">
          <svg
            className="portal-topbar-icon"
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M8 1.2 1.5 6.6v7.2c0 .4.3.7.7.7h3.9c.4 0 .7-.3.7-.7V10h2.4v3.8c0 .4.3.7.7.7h3.9c.4 0 .7-.3.7-.7V6.6z" />
          </svg>
          <span>CSE Faculty Portal</span>
        </Link>
        <Link className="portal-topbar-link" href="/course-tags">
          <span>Course Area Tags</span>
        </Link>
      </div>
    </header>
  );
}
