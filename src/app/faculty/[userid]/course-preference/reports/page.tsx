"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CoursePreferenceReportTable from "@/components/course-preference/CoursePreferenceReportTable";
import DetailSidebar from "@/components/faculty-detail/DetailSidebar";
import { APP_TITLE } from "@/config/appConfig";
import { displayValue } from "@/lib/format";
import { buildCourseReportRows } from "@/services/course-preference/coursePreferenceReportService";
import { fetchCoursePreferences, fetchFacultyDetail } from "@/services/faculty/facultyDetailService";
import type { CoursePreference, Faculty } from "@/types/faculty";

export default function CoursePreferenceReportPage() {
  const params = useParams<{ userid: string }>();
  const userid = typeof params?.userid === "string" ? params.userid : "";

  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [preferences, setPreferences] = useState<CoursePreference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function load() {
      if (!userid) return;
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [facultyRecord, prefs] = await Promise.all([
          fetchFacultyDetail(userid),
          fetchCoursePreferences(userid),
        ]);
        if (!isActive) return;

        setFaculty(facultyRecord);
        setPreferences(prefs);
      } catch (error) {
        if (!isActive) return;
        setErrorMessage(
          `Unable to load course preference report. ${error instanceof Error ? error.message : "Unknown error."}`
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    load();
    return () => {
      isActive = false;
    };
  }, [userid]);

  useEffect(() => {
    document.title = faculty
      ? `${faculty.name} - Course Preference Report | ${APP_TITLE}`
      : `Course Preference Report | ${APP_TITLE}`;
  }, [faculty]);

  const rows = useMemo(() => buildCourseReportRows(preferences), [preferences]);

  return (
    <section className="faculty-detail-panel">
      {isLoading ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status" role="status">
            Loading course preference report…
          </div>
        </div>
      ) : errorMessage ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            {errorMessage}
          </div>
        </div>
      ) : !faculty ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            No faculty detail was found for userid {displayValue(userid)}.
          </div>
        </div>
      ) : (
        <div className="faculty-detail-body">
          <div className="faculty-detail-workspace">
            <DetailSidebar userid={faculty.userid || userid} activePage="course-preference" />

            <div className="faculty-detail-content">
              <div className="faculty-profile-layout">
                <section
                  className="portal-page-intro portal-page-intro-compact"
                  aria-label="Page introduction"
                >
                  <h1 className="portal-page-title">{APP_TITLE}</h1>
                  <nav className="portal-breadcrumb" aria-label="Breadcrumb">
                    <Link href="/">CSE Faculty Portal</Link>
                    <span>&gt;</span>
                    <Link href={`/faculty/${faculty.userid}`}>{faculty.name}</Link>
                    <span>&gt;</span>
                    <Link href={`/faculty/${faculty.userid}/course-preference`}>
                      Course Preferences
                    </Link>
                    <span>&gt;</span>
                    <span>Report</span>
                  </nav>
                </section>

                <section className="faculty-secondary-card">
                  <div className="faculty-preference-heading">
                    <h2>Course Preference Report</h2>
                    <p>Courses selected by {faculty.name}.</p>
                  </div>

                  <div className="faculty-secondary-body">
                    <div className="faculty-secondary-section faculty-preference-section-inline">
                      <div className="cp-report-back-row">
                        <Link
                          href={`/faculty/${faculty.userid}/course-preference`}
                          className="cp-report-back-link"
                        >
                          ← Back to Course Preferences
                        </Link>
                      </div>

                      <CoursePreferenceReportTable facultyName={faculty.name} rows={rows} />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
