"use client";

import DataTableView from "@/components/DataTableView";
import { displayValue } from "@/lib/format";
import { createFacultyDetailTableConfig } from "@/services/faculty/facultyTableConfig";
import type { Faculty } from "@/types/faculty";

export default function StudentsTab({ faculty }: { faculty: Faculty }) {
  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Student</h2>
        <p>Students linked to this faculty member.</p>
      </div>
      {faculty.students.length > 0 ? (
        <DataTableView
          key={`students-${faculty.userid}`}
          config={createFacultyDetailTableConfig({
            filename: `${faculty.userid}-students`,
            title: `${faculty.name} Students`,
            showColumnVisibility: false,
          })}
          refreshKey={`students-${faculty.userid}-${faculty.students.length}`}
        >
          <thead>
            <tr>
              <th>Student Person Number</th>
              <th>Full Name</th>
              <th>Program</th>
            </tr>
          </thead>
          <tbody>
            {faculty.students.map((student) => (
              <tr key={student.studentId}>
                <td>{displayValue(student.studentId)}</td>
                <td>{displayValue(student.studentName)}</td>
                <td>{displayValue(student.program)}</td>
              </tr>
            ))}
          </tbody>
        </DataTableView>
      ) : (
        <div className="faculty-table-status" role="status">
          No student data is available for this faculty record.
        </div>
      )}
    </div>
  );
}
