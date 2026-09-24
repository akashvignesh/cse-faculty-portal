"use client";

import DataTableView from "@/components/DataTableView";
import { createFacultyDetailTableConfig } from "@/services/faculty/facultyTableConfig";
import type { CourseReportRow } from "@/services/course-preference/coursePreferenceReportService";

export interface CoursePreferenceReportTableProps {
  facultyName: string;
  rows: CourseReportRow[];
}

export default function CoursePreferenceReportTable({
  facultyName,
  rows,
}: CoursePreferenceReportTableProps) {
  return (
    <DataTableView
      key={`course-preference-report-${rows.length}`}
      config={createFacultyDetailTableConfig({
        filename: `course-preference-report-${facultyName}`,
        title: `Course Preference Report — ${facultyName}`,
        order: [[0, "desc"]],
        showExcel: true,
        showColumnVisibility: false,
      })}
      refreshKey={`course-preference-report-${rows.length}`}
    >
      <thead>
        <tr>
          <th>Priority</th>
          <th>Code</th>
          <th>Course Name</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.courseCode}-${index}`}>
            <td data-order={row.priority}>{row.priorityLabel}</td>
            <td>{row.courseCode || "—"}</td>
            <td>{row.courseName}</td>
          </tr>
        ))}
      </tbody>
    </DataTableView>
  );
}
