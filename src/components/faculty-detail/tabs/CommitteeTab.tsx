"use client";

import DataTableView from "@/components/DataTableView";
import { displayValue } from "@/lib/format";
import { createFacultyDetailTableConfig } from "@/services/faculty/facultyTableConfig";
import type { Faculty } from "@/types/faculty";

export default function CommitteeTab({ faculty }: { faculty: Faculty }) {
  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Committee</h2>
      </div>
      {faculty.committees.length > 0 ? (
        <DataTableView
          key={`committee-${faculty.userid}`}
          config={createFacultyDetailTableConfig({
            filename: `${faculty.userid}-committee`,
            title: `${faculty.name} Committee`,
            showColumnVisibility: false,
          })}
          refreshKey={`committee-${faculty.userid}-${faculty.committees.length}`}
        >
          <thead>
            <tr>
              <th>Committee Name</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {faculty.committees.map((committee) => (
              <tr key={committee.committeeId}>
                <td>{displayValue(committee.committeeName)}</td>
                <td>{displayValue(committee.role)}</td>
              </tr>
            ))}
          </tbody>
        </DataTableView>
      ) : (
        <div className="faculty-table-status" role="status">
          No committee data is available for this faculty record.
        </div>
      )}
    </div>
  );
}
