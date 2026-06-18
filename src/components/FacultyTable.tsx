"use client";

import Link from "next/link";
import type { Faculty } from "@/types/faculty";
import DataTableView from "./DataTableView";
import { createFacultyTableConfig } from "../services/faculty/facultyTableConfig";

export interface FacultyTableProps {
  records: Faculty[];
  isLoading: boolean;
  errorMessage: string;
}

function RosterTitle() {
  return (
    <div className="faculty-table-heading">
      <div className="faculty-table-title">
        <svg
          className="faculty-table-title-icon"
          viewBox="0 0 16 16"
          width="22"
          height="22"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM0 14.5A3.5 3.5 0 0 1 3.5 11h3A3.5 3.5 0 0 1 10 14.5V15H0v-.5Zm8 0a3.5 3.5 0 0 1 3.5-3.5h1A3.5 3.5 0 0 1 16 14.5V15H8v-.5Z" />
        </svg>
        <h2>CSE Faculty Roster</h2>
      </div>
    </div>
  );
}

export default function FacultyTable({ records, isLoading, errorMessage }: FacultyTableProps) {
  if (isLoading) {
    return (
      <section className="faculty-table-panel">
        <RosterTitle />
        <div className="faculty-table-shell">
          <div className="faculty-table-status" role="status">
            Loading faculty records...
          </div>
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="faculty-table-panel">
        <RosterTitle />
        <div className="faculty-table-shell">
          <div className="faculty-table-status faculty-table-status-error" role="alert">
            {errorMessage}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="faculty-table-panel">
      <RosterTitle />

      <div className="faculty-table-shell">
        <DataTableView
          className="display faculty-table"
          config={createFacultyTableConfig()}
          refreshKey={`faculty-roster-${records.length}`}
          wrapperClassName="faculty-table-wrapper"
        >
          <thead>
            <tr>
              <th>Person Number</th>
              <th>Name</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {records.map((faculty) => {
              const routeId = faculty.userid || faculty.personNumber;
              return (
                <tr key={routeId}>
                  <td>
                    <Link
                      className="faculty-table-link faculty-table-link-mono"
                      href={`/faculty/${routeId}`}
                    >
                      {faculty.personNumber}
                    </Link>
                  </td>
                  <td>
                    <Link className="faculty-table-link" href={`/faculty/${routeId}`}>
                      {faculty.name}
                    </Link>
                  </td>
                  <td>{faculty.primaryEmail}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTableView>
      </div>
    </section>
  );
}
