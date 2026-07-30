"use client";

import Link from "next/link";
import { usePermission } from "@/components/auth/AuthProvider";
import type { Resource } from "@/lib/permissions";

export type SidebarPage = "profile" | "course-preference" | "committee-preference";

export interface DetailSidebarProps {
  userid: string;
  activePage: SidebarPage;
}

const NAV_ITEMS: {
  page: SidebarPage;
  label: string;
  href: (userid: string) => string;
  icon: string;
  /** When set, shown only if the viewer can edit this resource for `userid`. */
  editResource?: Resource;
}[] = [
  {
    page: "profile",
    label: "Profile",
    href: (userid) => `/faculty/${userid}`,
    icon: "M8 8a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 8Zm0 1.25c-2.9 0-5.25 1.52-5.25 3.4V14h10.5v-1.35c0-1.88-2.35-3.4-5.25-3.4Z",
  },
  {
    page: "course-preference",
    label: "Edit Course Preference",
    href: (userid) => `/faculty/${userid}/course-preference`,
    icon: "M3 4.25h10v1.5H3Zm0 3h10v1.5H3Zm0 3h10v1.5H3Z",
    editResource: "course-plan",
  },
  {
    page: "committee-preference",
    label: "Roles and Committees",
    href: (userid) => `/faculty/${userid}/committee-preference`,
    icon: "M2 2h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z",
    editResource: "committee-assignment",
  },
];

export default function DetailSidebar({ userid, activePage }: DetailSidebarProps) {
  const { canEditResource } = usePermission();
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.editResource || canEditResource(item.editResource, userid) !== "none"
  );
  return (
    <aside className="faculty-detail-dashboard">
      <nav className="faculty-detail-dashboard-nav" aria-label="Faculty detail pages">
        {visibleItems.map((item) => {
          const isActive = item.page === activePage;
          return (
            <Link
              key={item.page}
              className={`faculty-detail-dashboard-item${isActive ? " is-active" : ""}`}
              href={userid ? item.href(userid) : "/"}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="faculty-detail-dashboard-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  className="faculty-detail-dashboard-icon-svg"
                  focusable="false"
                >
                  <path d={item.icon} />
                </svg>
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
