import type { Metadata } from "next";
import type { ReactNode } from "react";

import "datatables.net-dt/css/dataTables.dataTables.css";
import "datatables.net-buttons-dt/css/buttons.dataTables.css";
import "@/styles/globals.css";
import "@/styles/faculty-portal.css";

import FacultyPortalHeader from "@/components/FacultyPortalHeader";
import PortalFooter from "@/components/PortalFooter";
import { APP_TITLE } from "@/config/appConfig";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "University at Buffalo CSE faculty portal",
};

const PRELOADED_FONTS = [
  "/fonts/SofiaPro-Light.woff",
  "/fonts/SofiaPro-Regular.woff",
  "/fonts/MorePro-Medium.woff",
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {PRELOADED_FONTS.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>
        <div className="portal-page-shell">
          <div className="portal-page">
            <FacultyPortalHeader />
            {children}
            <PortalFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
