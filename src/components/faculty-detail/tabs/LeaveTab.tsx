"use client";

import DataTableView from "@/components/DataTableView";
import { displayValue } from "@/lib/format";
import { createFacultyDetailTableConfig } from "@/services/faculty/facultyTableConfig";
import type { Faculty } from "@/types/faculty";

export default function LeaveTab({ faculty }: { faculty: Faculty }) {
  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Leave</h2>
      </div>
      {faculty.leaves.length > 0 ? (
        <DataTableView
          key={`leave-${faculty.userid}`}
          config={createFacultyDetailTableConfig({
            filename: `${faculty.userid}-leave`,
            title: `${faculty.name} Leave`,
          })}
          refreshKey={`leave-${faculty.userid}-${faculty.leaves.length}`}
        >
          <thead>
            <tr>
              <th>Leave Type</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Location</th>
              <th>Reason</th>
              <th>Backup Faculty Person Number</th>
            </tr>
          </thead>
          <tbody>
            {faculty.leaves.map((leave) => (
              <tr key={leave.leaveId}>
                <td>{displayValue(leave.leaveType)}</td>
                <td>{displayValue(leave.startDate)}</td>
                <td>{displayValue(leave.endDate)}</td>
                <td>{displayValue(leave.location)}</td>
                <td>{displayValue(leave.reason)}</td>
                <td>{displayValue(leave.backupFacultyPersonNumber)}</td>
              </tr>
            ))}
          </tbody>
        </DataTableView>
      ) : (
        <div className="faculty-table-status" role="status">
          No leave data is available for this faculty record.
        </div>
      )}
    </div>
  );
}
