"use client";

import DataTableView from "@/components/DataTableView";
import { displayValue, formatCoursePreferencePriority } from "@/lib/format";
import { createFacultyDetailTableConfig } from "@/services/faculty/facultyTableConfig";
import type { Faculty } from "@/types/faculty";

export default function CoursePreferenceTab({ faculty }: { faculty: Faculty }) {
  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Course Preference</h2>
        <p>Current teaching preferences recorded for this faculty member.</p>
      </div>
      {faculty.coursePreferences.length > 0 ? (
        <DataTableView
          key={`course-preference-${faculty.userid}`}
          config={createFacultyDetailTableConfig({
            filename: `${faculty.userid}-course-preference`,
            title: `${faculty.name} Course Preference`,
            showColumnVisibility: false,
          })}
          refreshKey={`course-preference-${faculty.userid}-${faculty.coursePreferences.length}`}
        >
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Preference</th>
            </tr>
          </thead>
          <tbody>
            {faculty.coursePreferences.map((preference) => (
              <tr key={preference.teachingPreferenceId}>
                <td>{displayValue(preference.courseCode)}</td>
                <td>{displayValue(preference.preferredCourseName)}</td>
                <td>{formatCoursePreferencePriority(preference.priority)}</td>
              </tr>
            ))}
          </tbody>
        </DataTableView>
      ) : (
        <div className="faculty-table-status" role="status">
          No current course preference data is available for this faculty record.
        </div>
      )}
    </div>
  );
}
