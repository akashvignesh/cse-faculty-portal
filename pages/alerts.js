import InfoCardPage from "../components/InfoCardPage";

export default function AlertsPage() {
  return (
    <InfoCardPage
      activeKey="alerts"
      title="Alerts | CSE Portal"
      heading="Alerts"
      description="Review current student alerts, funding deadlines, and advisor notifications."
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Alerts", href: "/alerts" },
      ]}
    />
  );
}
