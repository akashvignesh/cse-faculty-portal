import InfoCardPage from "../components/InfoCardPage";

export default function ReportsPage() {
  return (
    <InfoCardPage
      activeKey="reports"
      title="Reports | CSE Portal"
      heading="Reports"
      description="Generate and export custom reports for staffs, advisors, and funding."
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Reports", href: "/reports" },
      ]}
    />
  );
}
