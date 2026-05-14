import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import FacultyPortalHeader from "../../../components/FacultyPortalHeader";
import PortalFooter from "../../../components/PortalFooter";
import { APP_TITLE, getAppConfig } from "../../../config/appConfig";
import { committeeList, committeeMembershipData } from "../../../data/committeeMockData";
import {
  findFacultyByUserid,
  loadFacultyRecords,
} from "../../../services/faculty/facultyService";

function displayValue(value) {
  return value ? value : "Not available";
}

// role values: "" = none, "P" = Position, "C" = Chair, "V" = Vice Chair, "X" = Member
const ROLE_OPTIONS = [
  { value: "",  label: "—"           },
  { value: "P", label: "P — Position"  },
  { value: "C", label: "C — Chair"     },
  { value: "V", label: "V — Vice Chair"},
  { value: "X", label: "X — Member"   },
];

const LEGEND_ITEMS = [
  { value: "P", label: "Position",  badgeClass: "committee-matrix-legend-badge-p" },
  { value: "C", label: "Chair",     badgeClass: "committee-matrix-legend-badge-c" },
  { value: "V", label: "Vice Chair",badgeClass: "committee-matrix-legend-badge-v" },
  { value: "X", label: "Member",    badgeClass: "committee-matrix-legend-badge-x" },
];

const SUMMARY_COLS = [
  { key: "chairs",        label: "# of Chairs",    editable: true,  type: "number" },
  { key: "total",         label: "# of Committees", editable: false, type: "number" },
  { key: "others",        label: "# of Others",    editable: true,  type: "number" },
  { key: "servicePoints", label: "Service Points",  editable: true,  type: "number" },
  { key: "comments",      label: "Comments",        editable: true,  type: "text"   },
];

export default function FacultyCommitteePreferencePage() {
  const router = useRouter();
  const { userid } = router.query;

  const [records, setRecords]             = useState([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [errorMessage, setErrorMessage]   = useState("");
  const [memberships, setMemberships]     = useState({});
  const [extras, setExtras]               = useState({});
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    const initial = {};
    committeeMembershipData.forEach(({ userid: uid, committeeId, role }) => {
      initial[`${uid}-${committeeId}`] = role || "";
    });
    setMemberships(initial);
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadRecords() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const config = getAppConfig();
        const nextRecords = await loadFacultyRecords({ config });
        if (!isActive) return;
        setRecords(nextRecords);
      } catch (error) {
        if (!isActive) return;
        setRecords([]);
        setErrorMessage(
          `Unable to load faculty data. ${error instanceof Error ? error.message : "Unknown error."}`
        );
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadRecords();
    return () => { isActive = false; };
  }, []);

  const faculty = useMemo(() => findFacultyByUserid(records, userid), [records, userid]);

  function getRole(uid, committeeId) {
    return memberships[`${uid}-${committeeId}`] ?? "";
  }

  function setRole(uid, committeeId, value) {
    setMemberships((current) => ({
      ...current,
      [`${uid}-${committeeId}`]: value,
    }));
    setSubmitMessage("");
  }

  function countCommittees(uid) {
    return committeeList.filter((c) => Boolean(getRole(uid, c.id))).length;
  }

  function getExtra(uid, key) {
    return extras[uid]?.[key] ?? "";
  }

  function setExtra(uid, key, value) {
    setExtras((current) => ({
      ...current,
      [uid]: { ...current[uid], [key]: value },
    }));
    setSubmitMessage("");
  }

  function handleSubmit() {
    const total = Object.values(memberships).filter(Boolean).length;
    setSubmitMessage(`Saved ${total} committee assignment${total === 1 ? "" : "s"}.`);
  }

  return (
    <>
      <Head>
        <title>
          {faculty
            ? `${faculty.name} Edit Committee Preference | ${APP_TITLE}`
            : `Edit Committee Preference | ${APP_TITLE}`}
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="portal-page-shell">
        <div className="portal-page">
          <FacultyPortalHeader />

          <section className="faculty-detail-panel">
            {isLoading ? (
              <div className="faculty-detail-body">
                <div className="faculty-table-status" role="status">Loading committee preferences…</div>
              </div>
            ) : errorMessage ? (
              <div className="faculty-detail-body">
                <div className="faculty-table-status faculty-table-status-error" role="alert">{errorMessage}</div>
              </div>
            ) : !faculty ? (
              <div className="faculty-detail-body">
                <div className="faculty-table-status faculty-table-status-error" role="alert">
                  No faculty detail was found for userid {displayValue(userid)}.
                </div>
              </div>
            ) : (
              <div className="faculty-detail-body">
                <div className="faculty-detail-workspace">

                  {/* ── Left sidebar ── */}
                  <aside className="faculty-detail-dashboard">
                    <nav className="faculty-detail-dashboard-nav" aria-label="Faculty detail pages">
                      <Link className="faculty-detail-dashboard-item" href={`/faculty/${faculty.userid}`}>
                        <span className="faculty-detail-dashboard-icon" aria-hidden="true">
                          <svg viewBox="0 0 16 16" className="faculty-detail-dashboard-icon-svg" focusable="false">
                            <path d="M8 8a2.75 2.75 0 1 0 0-5.5A2.75 2.75 0 0 0 8 8Zm0 1.25c-2.9 0-5.25 1.52-5.25 3.4V14h10.5v-1.35c0-1.88-2.35-3.4-5.25-3.4Z" />
                          </svg>
                        </span>
                        Profile
                      </Link>

                      <Link className="faculty-detail-dashboard-item" href={`/faculty/${faculty.userid}/course-preference`}>
                        <span className="faculty-detail-dashboard-icon" aria-hidden="true">
                          <svg viewBox="0 0 16 16" className="faculty-detail-dashboard-icon-svg" focusable="false">
                            <path d="M3 4.25h10v1.5H3Zm0 3h10v1.5H3Zm0 3h10v1.5H3Z" />
                          </svg>
                        </span>
                        Edit Course Preference
                      </Link>

                      <Link
                        className="faculty-detail-dashboard-item is-active"
                        href={`/faculty/${faculty.userid}/committee-preference`}
                        aria-current="page"
                      >
                        <span className="faculty-detail-dashboard-icon" aria-hidden="true">
                          <svg viewBox="0 0 16 16" className="faculty-detail-dashboard-icon-svg" focusable="false">
                            <path d="M2 2h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z" />
                          </svg>
                        </span>
                        Edit Committee Preference
                      </Link>
                    </nav>
                  </aside>

                  {/* ── Main content ── */}
                  <div className="faculty-detail-content">
                    <div className="faculty-profile-layout">
                      <section className="portal-page-intro portal-page-intro-compact" aria-label="Page introduction">
                        <h1 className="portal-page-title">{APP_TITLE}</h1>
                        <nav className="portal-breadcrumb" aria-label="Breadcrumb">
                          <Link href="/">CSE Faculty Portal</Link>
                          <span>&gt;</span>
                          <Link href={`/faculty/${faculty.userid}`}>Faculty</Link>
                          <span>&gt;</span>
                          <span>Edit Committee Preference</span>
                        </nav>
                      </section>

                      <section className="faculty-secondary-card">
                        <div className="faculty-committee-heading">
                          <h2>Edit Committee Preference</h2>
                          <p>Faculty committee membership assignments across all committees.</p>
                        </div>

                        <div className="faculty-secondary-body">
                          <div className="faculty-secondary-section faculty-preference-section-inline">

                            {/* ── Legend ── */}
                            <div className="committee-matrix-legend" aria-label="Role legend">
                              {LEGEND_ITEMS.map((item) => (
                                <span key={item.value} className="committee-matrix-legend-item">
                                  <span className={`committee-matrix-legend-badge ${item.badgeClass}`}>
                                    {item.value}
                                  </span>
                                  {item.label}
                                </span>
                              ))}
                            </div>

                            {/* ── Matrix table ── */}
                            <div className="committee-matrix-wrapper">
                              <table className="committee-matrix-table" role="grid">
                                <thead>
                                  <tr>
                                    <th className="committee-matrix-th-name" scope="col">
                                      Faculty Name
                                    </th>
                                    {committeeList.map((c) => (
                                      <th
                                        key={c.id}
                                        className="committee-matrix-th-rotated"
                                        scope="col"
                                        title={c.name}
                                      >
                                        <div className="committee-matrix-th-label">{c.name}</div>
                                      </th>
                                    ))}
                                    {SUMMARY_COLS.map((col) => (
                                      <th
                                        key={col.key}
                                        className="committee-matrix-th-rotated committee-matrix-th-summary"
                                        scope="col"
                                        title={col.label}
                                      >
                                        <div className="committee-matrix-th-label">{col.label}</div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>

                                <tbody>
                                  {records.map((member, rowIndex) => {
                                    const isEven = rowIndex % 2 === 1;
                                    return (
                                      <tr key={member.userid}>
                                        <td className={`committee-matrix-td-name${isEven ? " committee-matrix-td-name-even" : ""}`}>
                                          {member.name}
                                        </td>

                                        {committeeList.map((c) => {
                                          const role = getRole(member.userid, c.id);
                                          return (
                                            <td key={c.id} className="committee-matrix-td-cell">
                                              <select
                                                className={`committee-matrix-select${role ? ` committee-matrix-select-${role}` : ""}`}
                                                value={role}
                                                onChange={(e) => setRole(member.userid, c.id, e.target.value)}
                                                aria-label={`${member.name} — ${c.name}`}
                                                title={`${member.name} — ${c.name}`}
                                              >
                                                {ROLE_OPTIONS.map((opt) => (
                                                  <option key={opt.value} value={opt.value}>
                                                    {opt.value || "—"}
                                                  </option>
                                                ))}
                                              </select>
                                            </td>
                                          );
                                        })}

                                        {SUMMARY_COLS.map((col) => {
                                          if (!col.editable) {
                                            return (
                                              <td key={col.key} className="committee-matrix-td-summary committee-matrix-td-computed">
                                                {countCommittees(member.userid)}
                                              </td>
                                            );
                                          }
                                          return (
                                            <td key={col.key} className={`committee-matrix-td-summary${col.type === "text" ? " committee-matrix-td-comments" : ""}`}>
                                              <input
                                                type={col.type}
                                                className={col.type === "text" ? "committee-matrix-input-text" : "committee-matrix-input-number"}
                                                value={getExtra(member.userid, col.key)}
                                                onChange={(e) => setExtra(member.userid, col.key, e.target.value)}
                                                aria-label={`${col.label} for ${member.name}`}
                                                min={col.type === "number" ? "0" : undefined}
                                              />
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* ── Actions ── */}
                            <div className="faculty-preference-actions">
                              <button
                                type="button"
                                className="faculty-course-preference-submit"
                                onClick={handleSubmit}
                              >
                                Save Changes
                              </button>
                              {submitMessage ? (
                                <div className="faculty-course-preference-feedback" role="status">
                                  {submitMessage}
                                </div>
                              ) : null}
                            </div>

                          </div>
                        </div>
                      </section>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </section>

          <PortalFooter />
        </div>
      </div>
    </>
  );
}
