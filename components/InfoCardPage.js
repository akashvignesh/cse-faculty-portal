import PortalChrome from "./PortalChrome";

export default function InfoCardPage({
  activeKey,
  title,
  heading,
  description,
  breadcrumbItems,
}) {
  return (
    <PortalChrome
      title={title}
      activeKey={activeKey}
      pageTitle={heading}
      pageSubtitle="Faculty View"
      pageDesc={description}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="roster-card">
        <div className="roster-card-title">{heading}</div>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          {description}
        </p>
      </div>
    </PortalChrome>
  );
}
