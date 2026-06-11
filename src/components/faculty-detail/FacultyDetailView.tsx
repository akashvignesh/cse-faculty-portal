"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_TITLE } from "@/config/appConfig";
import { displayValue } from "@/lib/format";
import DetailSidebar from "./DetailSidebar";
import FacultyAboutCard from "./FacultyAboutCard";
import FacultySummaryCard from "./FacultySummaryCard";
import FacultyTabNav, { DETAIL_TABS, type DetailTab } from "./FacultyTabNav";
import { useFacultyDetail } from "./useFacultyDetail";
import AwardsTab from "./tabs/AwardsTab";
import CommitteeTab from "./tabs/CommitteeTab";
import CoursePreferenceTab from "./tabs/CoursePreferenceTab";
import LeaveTab from "./tabs/LeaveTab";
import ResearchTab from "./tabs/ResearchTab";
import StudentsTab from "./tabs/StudentsTab";
import TeachingHistoryTab from "./tabs/TeachingHistoryTab";

export default function FacultyDetailView({ userid }: { userid: string }) {
  const { faculty, isLoading, errorMessage, notFound, ensureSection } = useFacultyDetail(userid);
  const [activeTab, setActiveTab] = useState<DetailTab>(DETAIL_TABS.RESEARCH_AREA);

  useEffect(() => {
    document.title = faculty
      ? `${faculty.name} | ${APP_TITLE}`
      : `Faculty Detail | ${APP_TITLE}`;
  }, [faculty]);

  useEffect(() => {
    setActiveTab(DETAIL_TABS.RESEARCH_AREA);
  }, [userid]);

  function handleTabSelect(tab: DetailTab) {
    setActiveTab(tab);
    if (tab === DETAIL_TABS.TEACHING_HISTORY) {
      ensureSection("teaching-history");
    } else if (tab === DETAIL_TABS.COMMITTEE) {
      ensureSection("committees");
    } else if (tab === DETAIL_TABS.COURSE_PREFERENCE) {
      ensureSection("course-preferences");
    }
  }

  function renderTab() {
    if (!faculty) return null;

    switch (activeTab) {
      case DETAIL_TABS.TEACHING_HISTORY:
        return <TeachingHistoryTab key={faculty.userid} faculty={faculty} />;
      case DETAIL_TABS.COURSE_PREFERENCE:
        return <CoursePreferenceTab faculty={faculty} />;
      case DETAIL_TABS.LEAVE:
        return <LeaveTab faculty={faculty} />;
      case DETAIL_TABS.COMMITTEE:
        return <CommitteeTab faculty={faculty} />;
      case DETAIL_TABS.AWARDS:
        return <AwardsTab faculty={faculty} />;
      case DETAIL_TABS.STUDENT:
        return <StudentsTab faculty={faculty} />;
      case DETAIL_TABS.RESEARCH_AREA:
      default:
        return <ResearchTab faculty={faculty} />;
    }
  }

  return (
    <section className="faculty-detail-panel">
      {isLoading ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status" role="status">
            Loading faculty details...
          </div>
        </div>
      ) : errorMessage ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            {errorMessage}
          </div>
        </div>
      ) : notFound || !faculty ? (
        <div className="faculty-detail-body">
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            No faculty detail was found for userid {displayValue(userid)}.
          </div>
        </div>
      ) : (
        <div className="faculty-detail-body">
          <div className="faculty-detail-workspace">
            <DetailSidebar userid={userid} activePage="profile" />

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
                    <span>Faculty</span>
                  </nav>
                </section>

                <FacultySummaryCard faculty={faculty} />
                <FacultyAboutCard faculty={faculty} />

                <section className="faculty-secondary-card">
                  <FacultyTabNav activeTab={activeTab} onSelect={handleTabSelect} />
                  <div className="faculty-secondary-body">{renderTab()}</div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
