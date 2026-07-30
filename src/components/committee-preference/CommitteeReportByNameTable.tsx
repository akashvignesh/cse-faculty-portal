"use client";

import DataTableView from "@/components/DataTableView";
import { createFacultyDetailTableConfig } from "@/services/faculty/facultyTableConfig";
import type { ByNameReportRow } from "@/services/committee/committeeReportService";

export interface CommitteeReportByNameTableProps {
  rows: ByNameReportRow[];
}

export default function CommitteeReportByNameTable({ rows }: CommitteeReportByNameTableProps) {
  return (
    <DataTableView
      key={`committee-report-by-name-${rows.length}`}
      config={createFacultyDetailTableConfig({
        filename: "committee-report-by-name",
        title: "Committee Report — By Name",
        showExcel: true,
        showColumnVisibility: false,
      })}
      refreshKey={`committee-report-by-name-${rows.length}`}
    >
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Chair</th>
          <th>Vice Chair</th>
          <th>Member</th>
          <th>Alternate</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.userid}>
            <td>{row.name}</td>
            <td>{row.email}</td>
            <td>{row.chair.join(", ")}</td>
            <td>{row.viceChair.join(", ")}</td>
            <td>{row.member.join(", ")}</td>
            <td />
          </tr>
        ))}
      </tbody>
    </DataTableView>
  );
}
