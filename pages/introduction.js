import InfoCardPage from "../components/InfoCardPage";

export default function IntroductionPage() {
  return (
    <InfoCardPage
      activeKey="introduction"
      title="Introduction | CSE Portal"
      heading="Introduction"
      description="Overview of the CSE portal, quick links, and onboarding information."
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Introduction", href: "/introduction" },
      ]}
    />
  );
}
