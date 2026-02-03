"use client";

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ViewsPanel } from "@/components/settings/ViewsPanel";
import { NavigationPanel } from "@/components/settings/NavigationPanel";
import { MediaPanel } from "@/components/settings/MediaPanel";
import { SitePanel } from "@/components/settings/SitePanel";
import { CursorPanel } from "@/components/settings/CursorPanel";
import { ShortcutsPanel } from "@/components/settings/ShortcutsPanel";
import { AIPanel } from "@/components/settings/AIPanel";
import { ThemePanel } from "@/components/settings/ThemePanel";
import { ViewStylePanel } from "@/components/settings/ViewStylePanel";
import { TerminologyPanel } from "@/components/settings/TerminologyPanel";
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
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          {settingsTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="site" className="section">
          <SitePanel />
        </TabsContent>
        <TabsContent value="views" className="section">
          <ViewsPanel />
        </TabsContent>
        <TabsContent value="terminology" className="section">
          <TerminologyPanel />
        </TabsContent>
        <TabsContent value="styles" className="section">
          <ViewStylePanel />
        </TabsContent>
        <TabsContent value="navigation" className="section">
          <NavigationPanel />
        </TabsContent>
        <TabsContent value="media" className="section">
          <MediaPanel />
        </TabsContent>
        <TabsContent value="ai" className="section">
          <AIPanel />
        </TabsContent>
        <TabsContent value="theme" className="section">
          <ThemePanel />
        </TabsContent>
        <TabsContent value="cursor" className="section">
          <CursorPanel />
        </TabsContent>
        <TabsContent value="shortcuts" className="section">
          <ShortcutsPanel />
        </TabsContent>
      </Tabs>
    </section>
  );
}
