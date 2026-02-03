"use client";

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NavigationPanel } from "@/blogcomponents/settings/NavigationPanel";
import { MediaPanel } from "@/blogcomponents/settings/MediaPanel";
import { SitePanel } from "@/blogcomponents/settings/SitePanel";
import { CursorPanel } from "@/blogcomponents/settings/CursorPanel";
import { ShortcutsPanel } from "@/blogcomponents/settings/ShortcutsPanel";
import { AIPanel } from "@/blogcomponents/settings/AIPanel";
import { ThemePanel } from "@/blogcomponents/settings/ThemePanel";
import { ViewStylePanel } from "@/blogcomponents/settings/ViewStylePanel";
import { PurposesPanel } from "@/blogcomponents/settings/PurposesPanel";
import { CustomComponentsPanel } from "@/blogcomponents/settings/CustomComponentsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { settingsTabs } from "@/lib/content/settingsTabs";

type TabId = (typeof settingsTabs)[number]["id"];

export function SettingsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = useMemo(() => new Set(settingsTabs.map((tab) => tab.id)), []);
  const resolveTab = useCallback(
    (value: string | null) => (value && validTabs.has(value as TabId) ? (value as TabId) : "site"),
    [validTabs]
  );
  const [activeTab, setActiveTab] = useState<TabId>(() => resolveTab(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get("tab")));
  }, [resolveTab, searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = resolveTab(value);
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/settings?${params.toString()}`, { scroll: false });
    },
    [resolveTab, router, searchParams]
  );

  return (
    <section className="surface hero">
      <header>
        <h1>Settings</h1>
        <p>Manage views and navigation for your site.</p>
      </header>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="settings-tabs">
        <TabsList className="settings-tabs-list">
          {settingsTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="settings-tab">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="site" className="section settings-tab-content">
          <SitePanel />
        </TabsContent>
        <TabsContent value="styles" className="section settings-tab-content">
          <ViewStylePanel />
        </TabsContent>
        <TabsContent value="navigation" className="section settings-tab-content">
          <NavigationPanel />
        </TabsContent>
        <TabsContent value="purposes" className="section settings-tab-content">
          <PurposesPanel />
        </TabsContent>
        <TabsContent value="custom-components" className="section settings-tab-content">
          <CustomComponentsPanel />
        </TabsContent>
        <TabsContent value="media" className="section settings-tab-content">
          <MediaPanel />
        </TabsContent>
        <TabsContent value="ai" className="section settings-tab-content">
          <AIPanel />
        </TabsContent>
        <TabsContent value="theme" className="section settings-tab-content">
          <ThemePanel />
        </TabsContent>
        <TabsContent value="cursor" className="section settings-tab-content">
          <CursorPanel />
        </TabsContent>
        <TabsContent value="shortcuts" className="section settings-tab-content">
          <ShortcutsPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}
