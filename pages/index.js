import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PortalChrome from "../components/PortalChrome";
import { AVATAR_COLORS, STUDENTS } from "../lib/rosterData";

export default function Home() {
  const tableRef = useRef(null);
  const dtInstance = useRef(null);
  const [fundingMap, setFundingMap] = useState({});

  useEffect(() => {
    const map = {};
    STUDENTS.forEach((s) => {
      map[s.id] = s.funding;
    });
    setFundingMap(map);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.jQuery || !window.$) return;

    const $ = window.$;

    const timer = setInterval(() => {
      if (!$.fn.DataTable) return;
      clearInterval(timer);

      if (dtInstance.current) {
        dtInstance.current.destroy();
        dtInstance.current = null;
      }

      dtInstance.current = $(tableRef.current).DataTable({
        responsive: true,
        pageLength: 10,
        lengthMenu: [5, 10, 25, 50, 100],
        dom: "Bfrtip",
        buttons: [
          {
            extend: "copy",
            text: "📋 Copy",
            className: "dt-button",
          },
          {
            extend: "csv",
            text: "📄 CSV",
            className: "dt-button",
          },
          {
            extend: "excel",
            text: "📊 Excel",
            className: "dt-button",
          },
          {
            extend: "pdf",
            text: "📑 PDF",
            className: "dt-button",
          },
          {
            extend: "print",
            text: "🖨️ Print",
            className: "dt-button",
          },
          {
            extend: "colvis",
            text: "👁 Columns",
            className: "dt-button",
          },
        ],
        select: {
          style: "multi",
        },
        columnDefs: [
          { orderable: false, targets: [0, 6, 7, 8] },
          { searchable: false, targets: [0] },
        ],
        language: {
          search: "Search:",
          lengthMenu: "_MENU_ entries per page",
          info: "Showing _START_ to _END_ of _TOTAL_ CSE staffs",
          paginate: {
            previous: "‹",
            next: "›",
          },
        },
        initComplete: function () {
          const wrapper = $(tableRef.current).closest(".dt-container, .dataTables_wrapper");
          wrapper.find(".dt-buttons").prependTo(wrapper);
        },
      });
    }, 200);

    return () => {
      clearInterval(timer);
      if (dtInstance.current) {
        try { dtInstance.current.destroy(); } catch (_) {}
        dtInstance.current = null;
      }
    };
  }, []);

  const handleFundingChange = (id, val) => {
    setFundingMap((prev) => ({ ...prev, [id]: val }));
  };

  return (
    <PortalChrome
      activeKey="roster"
      title="CSE Portal — University at Buffalo"
      pageTitle="CSE Portal"
      pageSubtitle="Faculty View"
      pageDesc="Manage the CSE program"
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Manager", href: "/manager" },
      ]}
    >
      <div className="roster-card">
        <div className="roster-card-title">
          <span>👥</span> CSE Spring 2026 Roster
        </div>

        <div style={{ overflowX: "auto" }}>
          <table ref={tableRef} className="dataTable display nowrap" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Userid</th>
                <th>Campus Office Address</th>
                <th>Faculty Advisor #1</th>
                <th>Faculty Advisor #2</th>
                <th>Funding Source</th>
                <th>Funding Editor</th>
                <th>Funding DateTime</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s, i) => (
                <tr key={s.id}>
                  <td>
                    <div
                      className="student-avatar-placeholder"
                      style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {s.initials}
                    </div>
                  </td>

                  <td>
                    <Link href={`/staffs/${s.userid}`}>{s.name}</Link>
                  </td>

                  <td>
                    <a
                      href={`mailto:${s.userid}@buffalo.edu`}
                      style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                    >
                      {s.userid}
                    </a>
                  </td>

                  <td style={{ whiteSpace: "normal", minWidth: 110 }}>{s.office}</td>

                  <td>
                    <Link href={`/faculty/${s.advisor1}`}>{s.advisor1}</Link>
                  </td>

                  <td>{s.advisor2 ? <Link href={`/faculty/${s.advisor2}`}>{s.advisor2}</Link> : ""}</td>

                  <td>
                    <select
                      className="funding-select"
                      value={fundingMap[s.id] || s.funding}
                      onChange={(e) => handleFundingChange(s.id, e.target.value)}
                    >
                      <option>Research Asst</option>
                      <option>Teaching Asst</option>
                      <option>Fellowship</option>
                      <option>External Grant</option>
                      <option>Self-Funded</option>
                      <option>Unfunded</option>
                    </select>
                  </td>

                  <td>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {s.fundingEditor}
                    </span>
                  </td>

                  <td>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {s.fundingDate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalChrome>
  );
}
