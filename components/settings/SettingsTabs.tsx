"use client";

import { useState } from "react";
import { ViewsPanel } from "@/components/settings/ViewsPanel";
import { NavigationPanel } from "@/components/settings/NavigationPanel";
import { MediaPanel } from "@/components/settings/MediaPanel";
import { SitePanel } from "@/components/settings/SitePanel";

const tabs = [
  { id: "site", label: "Site" },
  { id: "views", label: "Views" },
  { id: "navigation", label: "Navigation" },
  { id: "media", label: "Media" },
  { id: "ai", label: "AI" },
  { id: "theme", label: "Theme" },
  { id: "structure", label: "Structure" },
  { id: "knowledge", label: "Knowledge Base" }
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SettingsTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("site");

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
        {activeTab === "site" ? <SitePanel /> : null}
        {activeTab === "views" ? <ViewsPanel /> : null}
        {activeTab === "navigation" ? <NavigationPanel /> : null}
        {activeTab === "media" ? <MediaPanel /> : null}
        {activeTab === "ai" ? null : null}
        {activeTab === "theme" ? null : null}
        {activeTab === "structure" ? null : null}
        {activeTab === "knowledge" ? null : null}
      </div>
    </section>
  );
}
