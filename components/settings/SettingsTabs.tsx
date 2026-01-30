"use client";

import { useState } from "react";
import { ViewsPanel } from "@/components/settings/ViewsPanel";
import { NavigationPanel } from "@/components/settings/NavigationPanel";
import { MediaPanel } from "@/components/settings/MediaPanel";

const tabs = [
  { id: "views", label: "Views" },
  { id: "navigation", label: "Navigation" },
  { id: "media", label: "Media" }
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("views");

  return (
    <section className="surface hero">
      <header>
        <h1>Settings</h1>
        <p>Manage views and navigation for your site.</p>
      </header>
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="section">
        {activeTab === "views" ? <ViewsPanel /> : null}
        {activeTab === "navigation" ? <NavigationPanel /> : null}
        {activeTab === "media" ? <MediaPanel /> : null}
      </div>
    </section>
  );
}
