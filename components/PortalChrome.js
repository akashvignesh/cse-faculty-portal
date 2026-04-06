import Head from "next/head";
import Link from "next/link";

function UBLogo() {
  return (
    <svg className="ub-logo-img" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="80" fill="none" />
      <text
        x="8"
        y="62"
        fontFamily="Georgia, serif"
        fontWeight="bold"
        fontSize="68"
        fill="#005bbb"
      >
        UB
      </text>
      <line x1="8" y1="70" x2="112" y2="70" stroke="#005bbb" strokeWidth="4" />
    </svg>
  );
}

function Sidebar({ activeKey }) {
  const navItems = [
    { key: "introduction", href: "/introduction", icon: "📄", label: "Introduction" },
    { key: "roster", href: "/", icon: "👥", label: "Roster" },
    { key: "alerts", href: "/alerts", icon: "🔔", label: "Alerts", badge: "5" },
    { key: "teaching", href: "/teaching-prefs", icon: "🤍", label: "Teaching Prefs" },
  ];

  const reportItems = [
    { key: "dashboard", href: "/dashboard", icon: "📊", label: "Dashboard", trailing: "∨" },
    { key: "reports", href: "/reports", icon: "📈", label: "Reports", sub: true },
  ];

  const bottomItems = [
    { key: "settings", href: "/settings", icon: "⚙️", label: "Settings" },
    { key: "signout", href: "/signout", icon: "🚪", label: "Sign Out" },
  ];

  return (
    <aside className="sidebar">
      {navItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`sidebar-item ${activeKey === item.key ? "active" : ""}`}
        >
          <span className="sidebar-item-icon">{item.icon}</span>
          {item.label}
          {item.badge ? <span className="badge-alert">{item.badge}</span> : null}
        </Link>
      ))}

      <hr className="sidebar-divider" />
      <div className="sidebar-section-label">Saved Reports</div>

      {reportItems.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`sidebar-item ${item.sub ? "sidebar-sub" : ""} ${activeKey === item.key ? "active" : ""}`}
        >
          <span className="sidebar-item-icon">{item.icon}</span>
          {item.label}
          {item.trailing ? <span style={{ marginLeft: "auto", fontSize: 12 }}>{item.trailing}</span> : null}
        </Link>
      ))}

      <hr className="sidebar-divider" />
      <div className="sidebar-bottom">
        {bottomItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`sidebar-item ${activeKey === item.key ? "active" : ""}`}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

export default function PortalChrome({
  title,
  activeKey,
  pageTitle,
  pageSubtitle,
  pageDesc,
  breadcrumbItems,
  children,
}) {
  return (
    <>
      <Head>
        <title>{title || "CSE Portal — University at Buffalo"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="portal-shell">
        <header className="ub-header">
          <div className="ub-logo-block">
            <UBLogo />
            <div className="ub-logo-text">
              <h1>University at Buffalo</h1>
              <p>Department of Computer Science and Engineering</p>
              <p style={{ marginTop: 0 }}>School of Engineering and Applied Sciences</p>
            </div>
          </div>
        </header>

        <div className="topbar">
          <span className="topbar-icon">🏠</span>
          <Link href="/" className="topbar-link">CSE Portal</Link>
        </div>

        <div className="portal-body">
          <Sidebar activeKey={activeKey} />

          <main className="content">
            <div className="page-title">{pageTitle || "CSE Portal"}</div>
            <div className="page-subtitle">{pageSubtitle || "Faculty View"}</div>
            <div className="page-desc">{pageDesc || "Manage the CSE program"}</div>

            <nav className="breadcrumb">
              <span>🏠</span>
              {breadcrumbItems?.map((item, index) => (
                <span key={item.href}>
                  <span className="breadcrumb-sep">›</span>
                  <Link href={item.href}>{item.label}</Link>
                  {index < breadcrumbItems.length - 1 ? " " : ""}
                </span>
              ))}
            </nav>

            {children}
          </main>
        </div>
      </div>
    </>
  );
}
