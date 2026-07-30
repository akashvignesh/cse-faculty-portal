"use client";

import Link from "next/link";
import { usePermission, useSession } from "@/components/auth/AuthProvider";

export default function FacultyPortalHeader() {
  const { can } = usePermission();
  const { session, isLoading } = useSession();
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
            width="14"
            height="14"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M8 1.2 1.5 6.6v7.2c0 .4.3.7.7.7h3.9c.4 0 .7-.3.7-.7V10h2.4v3.8c0 .4.3.7.7.7h3.9c.4 0 .7-.3.7-.7V6.6z" />
          </svg>
          <span>CSE Faculty Portal</span>
        </Link>
        {/* The course-tags page is purely an editing tool — hide it from
            roles that cannot edit tags (the page itself is also read-only-
            gated, and the API enforces server-side). */}
        {can("course-tags:edit") ? (
          <Link className="portal-topbar-link" href="/course-tags">
            <span>Course Area Tags</span>
          </Link>
        ) : null}
        {can("user-role:edit") ? (
          <Link className="portal-topbar-link" href="/user-roles">
            <span>User Roles</span>
          </Link>
        ) : null}

        {/* Who am I — the signed-in user + role. In production the userid comes
            from the SSO session; today it is DEV_USERID / the dev switcher. */}
        {!isLoading && session && (
          <span
            className="portal-topbar-user"
            style={{ marginLeft: "auto", opacity: 0.9, whiteSpace: "nowrap" }}
            title={`Signed in as ${session.userid} (${session.role})`}
          >
            Signed in as <strong>{session.userid}</strong> ({session.role})
          </span>
        )}
      </div>
    </header>
  );
}
