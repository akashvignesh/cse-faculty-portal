import InfoCardPage from "../components/InfoCardPage";

export default function DashboardPage() {
  return (
    <InfoCardPage
      activeKey="dashboard"
      title="Dashboard | CSE Portal"
      heading="Dashboard"
      description="View high-level CSE roster metrics and funding summaries."
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Dashboard", href: "/dashboard" },
      ]}
    />
  );
}
