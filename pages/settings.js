import InfoCardPage from "../components/InfoCardPage";

export default function SettingsPage() {
  return (
    <InfoCardPage
      activeKey="settings"
      title="Settings | CSE Portal"
      heading="Settings"
      description="Manage your account settings, notification preferences, and defaults."
      breadcrumbItems={[
        { label: "CSE", href: "/cse" },
        { label: "Settings", href: "/settings" },
      ]}
    />
  );
}
