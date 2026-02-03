import { SettingsTabs } from "@/blogcomponents/settings/SettingsTabs";

export default function SettingsPage() {
  if (process.env.NEXT_PUBLIC_BUILD_MODE === "publish") {
    return (
      <section className="surface hero">
        <h1>Settings</h1>
        <p>Settings are only available in Author Mode.</p>
      </section>
    );
  }

  return <SettingsTabs />;
}
