"use client";

import DataTableView from "@/components/DataTableView";
import { createFacultyDetailTableConfig } from "@/services/faculty/facultyTableConfig";
import type { ByCommitteeReportRow } from "@/services/committee/committeeReportService";

export interface CommitteeReportByCommitteeTableProps {
  rows: ByCommitteeReportRow[];
}

export default function CommitteeReportByCommitteeTable({
  rows,
}: CommitteeReportByCommitteeTableProps) {
  return (
    <DataTableView
      key={`committee-report-by-committee-${rows.length}`}
      config={createFacultyDetailTableConfig({
        filename: "committee-report-by-committee",
        title: "Committee Report — By Committee",
        showExcel: true,
        showColumnVisibility: false,
      })}
      refreshKey={`committee-report-by-committee-${rows.length}`}
    >
      <thead>
        <tr>
          <th>Committee Name</th>
          <th>Chair(s)</th>
          <th>Vice Chair(s)</th>
          <th>Alternate(s)</th>
          <th>Members</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.committeeId}>
            <td>{row.committeeName}</td>
            <td>{row.chairs.join(", ")}</td>
            <td>{row.viceChairs.join(", ")}</td>
            <td />
            <td>{row.members.join(", ")}</td>
          </tr>
        ))}
      </tbody>
    </DataTableView>
  );
}
