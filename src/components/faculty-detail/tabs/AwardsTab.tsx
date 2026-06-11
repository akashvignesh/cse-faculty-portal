"use client";

import DataTableView from "@/components/DataTableView";
import { displayValue } from "@/lib/format";
import { createFacultyDetailTableConfig } from "@/services/faculty/facultyTableConfig";
import type { Faculty } from "@/types/faculty";

export default function AwardsTab({ faculty }: { faculty: Faculty }) {
  return (
    <div className="faculty-secondary-section">
      <div className="faculty-preference-heading">
        <h2>Awards</h2>
        <p>Awards and honors associated with this faculty member.</p>
      </div>
      {faculty.awards.length > 0 ? (
        <DataTableView
          key={`awards-${faculty.userid}`}
          config={createFacultyDetailTableConfig({
            filename: `${faculty.userid}-awards`,
            title: `${faculty.name} Awards`,
          })}
          refreshKey={`awards-${faculty.userid}-${faculty.awards.length}`}
        >
          <thead>
            <tr>
              <th>Award ID</th>
              <th>Award Name</th>
              <th>Award Year</th>
              <th>Organization</th>
            </tr>
          </thead>
          <tbody>
            {faculty.awards.map((award) => (
              <tr key={award.awardId}>
                <td>{displayValue(award.awardId)}</td>
                <td>{displayValue(award.awardName)}</td>
                <td>{displayValue(award.awardYear)}</td>
                <td>{displayValue(award.organization)}</td>
              </tr>
            ))}
          </tbody>
        </DataTableView>
      ) : (
        <div className="faculty-table-status" role="status">
          No awards data is available for this faculty record.
        </div>
      )}
    </div>
  );
}
