import InfoCardPage from "../components/InfoCardPage";

export default function ManagerPage() {
  return (
    <InfoCardPage
      activeKey="roster"
      title="Manager | CSE Portal"
      heading="Manager"
      description="Manager workspace for roster updates and program coordination."
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Manager", href: "/manager" },
      ]}
    />
  );
}
