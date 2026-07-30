"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePermission } from "@/components/auth/AuthProvider";
import CommitteeReportByNameTable from "@/components/committee-preference/CommitteeReportByNameTable";
import DetailSidebar from "@/components/faculty-detail/DetailSidebar";
import { APP_TITLE } from "@/config/appConfig";
import { displayValue } from "@/lib/format";
import { currentAcademicYear } from "@/lib/term";
import { loadMatrixData, type MatrixColumn } from "@/services/committee/committeeMatrixService";
import { buildByNameReport } from "@/services/committee/committeeReportService";
import { findFacultyByUserid, loadFacultyRecords } from "@/services/faculty/facultyService";
import type { Faculty } from "@/types/faculty";

export default function CommitteeReportByNamePage() {
  const params = useParams<{ userid: string }>();
  const userid = typeof params?.userid === "string" ? params.userid : "";
  const academicYear = useMemo(() => currentAcademicYear(), []);
  const { can, isLoading: isAuthLoading } = usePermission();
  // Committee reports are part of committee management — chair-only, matching
  // the matrix page (the data endpoints reject non-chair reads server-side too).
  const canViewCommittee = can("committee:view");

  const [records, setRecords] = useState<Faculty[]>([]);
  const [columns, setColumns] = useState<MatrixColumn[]>([]);
  const [memberships, setMemberships] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [nextRecords, matrixData] = await Promise.all([
          loadFacultyRecords(),
          loadMatrixData(academicYear),
        ]);
        if (!isActive) return;
        setRecords(nextRecords);
        setColumns(matrixData.columns);
        const cells: Record<string, string> = {};
        matrixData.assignments.forEach((assignment) => {
          cells[`${assignment.userid}-${assignment.catalogId}`] = assignment.uiCode;
        });
        setMemberships(cells);
      } catch (error) {
        if (!isActive) return;
        setErrorMessage(
          `Unable to load committee data. ${error instanceof Error ? error.message : "Unknown error."}`
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    if (!isAuthLoading && canViewCommittee) {
      load();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
    return () => {
      isActive = false;
    };
  }, [academicYear, isAuthLoading, canViewCommittee]);

  const faculty = useMemo(() => findFacultyByUserid(records, userid), [records, userid]);

  useEffect(() => {
    document.title = `Committee Report — By Name | ${APP_TITLE}`;
  }, []);

  const rows = useMemo(
    () => buildByNameReport(records, columns, memberships),
    [records, columns, memberships]
  );

  return (
    <section className="faculty-detail-panel">
      {!isAuthLoading && !canViewCommittee ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            Committee management is handled by the department chair. Your role does not have access
            to committee reports.
          </div>
        </div>
      ) : isLoading ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status" role="status">
            Loading committee report…
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
            <DetailSidebar userid={faculty.userid} activePage="committee-preference" />

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
                    <Link href={`/faculty/${faculty.userid}`}>Faculty</Link>
                    <span>&gt;</span>
                    <Link href={`/faculty/${faculty.userid}/committee-preference`}>
                      Roles and Committees
                    </Link>
                    <span>&gt;</span>
                    <span>By Name</span>
                  </nav>
                </section>

                <section className="faculty-secondary-card">
                  <div className="faculty-committee-heading">
                    <h2>Committee Report — By Name</h2>
                    <p>Committee assignments grouped by faculty member for {academicYear}.</p>
                  </div>

                  <div className="faculty-secondary-body">
                    <div className="faculty-secondary-section faculty-preference-section-inline">
                      <div className="committee-report-toolbar">
                        <Link
                          href={`/faculty/${faculty.userid}/committee-preference`}
                          className="committee-report-back-link"
                        >
                          ← Back to Roles and Committees
                        </Link>
                      </div>

                      <CommitteeReportByNameTable rows={rows} />
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
