"use client";

import { useState } from "react";
import DataTableView from "@/components/DataTableView";
import { displayValue, formatTerm, toggleFilterValue } from "@/lib/format";
import { createFacultyDetailTableConfig } from "@/services/faculty/facultyTableConfig";
import type { Faculty } from "@/types/faculty";
import TeachingHistoryFilterDropdown from "./TeachingHistoryFilterDropdown";

const TEACHING_TERM_ORDER = ["spring", "summer", "fall"];

export default function TeachingHistoryTab({ faculty }: { faculty: Faculty }) {
  const [yearFilters, setYearFilters] = useState<string[]>([]);
  const [termFilters, setTermFilters] = useState<string[]>([]);

  const rows = faculty.teachingHistory?.rows ?? [];

  const availableYears = Array.from(
    new Set(
      rows
        .map((course) => course.year)
        .filter((year) => year !== null && year !== undefined && year !== "")
        .map(String)
    )
  ).sort((firstYear, secondYear) => Number(secondYear) - Number(firstYear));

  const termSet = new Set(
    rows
      .map((course) => course.term)
      .filter(Boolean)
      .map(String)
  );
  const availableTerms = [
    ...TEACHING_TERM_ORDER.filter((term) => termSet.has(term)),
    ...Array.from(termSet)
      .filter((term) => !TEACHING_TERM_ORDER.includes(term))
      .sort(),
  ];

  const selectedYearSet = new Set(yearFilters);
  const selectedTermSet = new Set(termFilters);
  const filteredRows = rows.filter((course) => {
    const matchesYear = yearFilters.length === 0 || selectedYearSet.has(String(course.year));
    const matchesTerm = termFilters.length === 0 || selectedTermSet.has(String(course.term));
    return matchesYear && matchesTerm;
  });

  const yearCount = new Set(
    filteredRows
      .map((course) => course.year)
      .filter((year) => year !== null && year !== undefined && year !== "")
      .map(String)
  ).size;
  const graduateCount = filteredRows.filter(
    (course) => String(course.courseCareer).toLowerCase() === "graduate"
  ).length;
  const undergraduateCount = filteredRows.filter(
    (course) => String(course.courseCareer).toLowerCase() === "undergraduate"
  ).length;

  const refreshKey = [
    "teaching-history",
    faculty.userid,
    filteredRows.length,
    yearFilters.join("-"),
    termFilters.join("-"),
  ].join("-");

  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Teaching History</h2>
        <p>Courses taught by term and academic year.</p>
      </div>

      {rows.length > 0 ? (
        <>
          <div className="faculty-history-filters" aria-label="Teaching history filters">
            <TeachingHistoryFilterDropdown
              label="Year"
              values={availableYears}
              selectedValues={yearFilters}
              onToggle={(year) => setYearFilters((current) => toggleFilterValue(current, year))}
              onClear={() => setYearFilters([])}
            />
            <TeachingHistoryFilterDropdown
              label="Term"
              values={availableTerms}
              selectedValues={termFilters}
              onToggle={(term) => setTermFilters((current) => toggleFilterValue(current, term))}
              onClear={() => setTermFilters([])}
              formatValue={formatTerm}
            />
          </div>

          <div className="faculty-history-summary" aria-label="Teaching history summary">
            <div className="faculty-history-summary-item">
              <span>Years</span>
              <strong>{yearCount}</strong>
            </div>
            <div className="faculty-history-summary-item">
              <span>Classes</span>
              <strong>{filteredRows.length}</strong>
            </div>
            <div className="faculty-history-summary-item">
              <span>Graduate</span>
              <strong>{graduateCount}</strong>
            </div>
            <div className="faculty-history-summary-item">
              <span>Undergraduate</span>
              <strong>{undergraduateCount}</strong>
            </div>
          </div>

          {filteredRows.length > 0 ? (
            <DataTableView
              key={refreshKey}
              config={createFacultyDetailTableConfig({
                filename: `${faculty.userid}-teaching-history`,
                title: `${faculty.name} Teaching History`,
                order: [
                  [0, "desc"],
                  [1, "asc"],
                ],
                showColumnVisibility: false,
              })}
              refreshKey={refreshKey}
            >
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Term</th>
                  <th>Class Number</th>
                  <th>Course Name</th>
                  <th>Course Type</th>
                  <th>Course Career</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((course) => (
                  <tr key={course.teachingHistoryId}>
                    <td>{displayValue(course.year)}</td>
                    <td>{formatTerm(course.term)}</td>
                    <td>{displayValue(course.classNumber)}</td>
                    <td>{displayValue(course.courseName)}</td>
                    <td>{displayValue(course.courseType)}</td>
                    <td>{displayValue(course.courseCareer)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTableView>
          ) : (
            <div className="faculty-table-status" role="status">
              No teaching history matches the selected filters.
            </div>
          )}
        </>
      ) : (
        <div className="faculty-table-status" role="status">
          No teaching history data is available for this faculty record.
        </div>
      )}
    </div>
  );
}
