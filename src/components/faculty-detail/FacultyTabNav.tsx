"use client";

export const DETAIL_TABS = {
  RESEARCH_AREA: "research-area",
  TEACHING_HISTORY: "teaching-history",
  COURSE_PREFERENCE: "course-preference",
  LEAVE: "leave",
  COMMITTEE: "committee",
  AWARDS: "awards",
  STUDENT: "student",
} as const;

export type DetailTab = (typeof DETAIL_TABS)[keyof typeof DETAIL_TABS];

const TAB_LABELS: { tab: DetailTab; label: string }[] = [
  { tab: DETAIL_TABS.RESEARCH_AREA, label: "Research Area" },
  { tab: DETAIL_TABS.TEACHING_HISTORY, label: "Teaching History" },
  { tab: DETAIL_TABS.COURSE_PREFERENCE, label: "Course Preference" },
  { tab: DETAIL_TABS.LEAVE, label: "Leave" },
  { tab: DETAIL_TABS.COMMITTEE, label: "Committee" },
  { tab: DETAIL_TABS.AWARDS, label: "Awards" },
  { tab: DETAIL_TABS.STUDENT, label: "Student" },
];

export interface FacultyTabNavProps {
  activeTab: DetailTab;
  onSelect: (tab: DetailTab) => void;
}

export default function FacultyTabNav({ activeTab, onSelect }: FacultyTabNavProps) {
  return (
    <div className="faculty-secondary-tabs" role="tablist" aria-label="Faculty sub sections">
      {TAB_LABELS.map(({ tab, label }) => (
        <button
          key={tab}
          type="button"
          className={`faculty-secondary-tab ${activeTab === tab ? "is-active" : ""}`}
          onClick={() => onSelect(tab)}
          role="tab"
          aria-selected={activeTab === tab}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
