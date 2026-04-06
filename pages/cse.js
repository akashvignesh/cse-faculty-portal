import InfoCardPage from "../components/InfoCardPage";

export default function CsePage() {
  return (
    <InfoCardPage
      activeKey="roster"
      title="CSE | CSE Portal"
      heading="CSE"
      description="CSE section landing page for program and roster administration."
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
      ]}
    />
  );
}
