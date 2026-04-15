import Link from "next/link";
import { useEffect, useRef } from "react";
import { createFacultyTableConfig } from "../services/faculty/facultyTableConfig";

export default function FacultyTable({ records, isLoading, errorMessage }) {
  const tableRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    async function initialiseTable() {
      if (!tableRef.current || isLoading || errorMessage) {
        return;
      }

      const DataTableModule = await import("datatables.net-dt");
      const DataTable = DataTableModule.default;

      if (!isActive || !tableRef.current) {
        return;
      }

      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }

      instanceRef.current = new DataTable(
        tableRef.current,
        createFacultyTableConfig()
      );
    }

    initialiseTable();

    return () => {
      isActive = false;

      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [errorMessage, isLoading, records]);

  if (isLoading) {
    return (
      <section className="faculty-table-panel">
        <div className="faculty-table-heading">
          <div className="faculty-table-title">
            <svg
              className="faculty-table-title-icon"
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM0 14.5A3.5 3.5 0 0 1 3.5 11h3A3.5 3.5 0 0 1 10 14.5V15H0v-.5Zm8 0a3.5 3.5 0 0 1 3.5-3.5h1A3.5 3.5 0 0 1 16 14.5V15H8v-.5Z" />
            </svg>
            <h2>CSE Faculty Roster</h2>
          </div>
        </div>

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
        <div className="faculty-table-heading">
          <div className="faculty-table-title">
            <svg
              className="faculty-table-title-icon"
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM0 14.5A3.5 3.5 0 0 1 3.5 11h3A3.5 3.5 0 0 1 10 14.5V15H0v-.5Zm8 0a3.5 3.5 0 0 1 3.5-3.5h1A3.5 3.5 0 0 1 16 14.5V15H8v-.5Z" />
            </svg>
            <h2>CSE Faculty Roster</h2>
          </div>
        </div>

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
      <div className="faculty-table-heading">
        <div className="faculty-table-title">
          <svg
            className="faculty-table-title-icon"
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM0 14.5A3.5 3.5 0 0 1 3.5 11h3A3.5 3.5 0 0 1 10 14.5V15H0v-.5Zm8 0a3.5 3.5 0 0 1 3.5-3.5h1A3.5 3.5 0 0 1 16 14.5V15H8v-.5Z" />
          </svg>
          <h2>CSE Faculty Roster</h2>
        </div>
      </div>

      <div className="faculty-table-shell">
        <div className="faculty-table-wrapper">
          <table ref={tableRef} className="display faculty-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Userid</th>
                <th>Campus Office Address</th>
              </tr>
            </thead>
            <tbody>
              {records.map((faculty) => (
                <tr key={faculty.userid}>
                  <td>
                    <Link className="faculty-table-link" href={`/faculty/${faculty.userid}`}>
                      {faculty.name}
                    </Link>
                  </td>
                  <td>
                    <Link className="faculty-table-link faculty-table-link-mono" href={`/faculty/${faculty.userid}`}>
                      {faculty.userid}
                    </Link>
                  </td>
                  <td>{faculty.officeAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
