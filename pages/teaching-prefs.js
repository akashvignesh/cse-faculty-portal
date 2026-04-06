import InfoCardPage from "../components/InfoCardPage";

export default function TeachingPrefsPage() {
  return (
    <InfoCardPage
      activeKey="teaching"
      title="Teaching Preferences | CSE Portal"
      heading="Teaching Preferences"
      description="Track and update TA course preferences for CSE graduate staffs."
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Teaching Prefs", href: "/teaching-prefs" },
      ]}
    />
  );
}
