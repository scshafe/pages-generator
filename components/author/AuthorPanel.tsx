"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfigurationPanel } from "@/components/author/ConfigurationPanel";
import { AIAssistantPanel } from "@/components/author/AIAssistantPanel";
import { isEditableTarget } from "@/components/views/useFocusNavigator";

type PanelTab = "configuration" | "agent";

export function AuthorPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>("configuration");
  const [isMinimized, setIsMinimized] = useState(false);

  const handleTabClick = useCallback((tab: PanelTab) => {
    setActiveTab((prev) => {
      if (prev === tab) {
        setIsMinimized((prevMin) => !prevMin);
        return prev;
      }
      setIsMinimized(false);
      return tab;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const isHyper = event.metaKey && event.ctrlKey && event.altKey && event.shiftKey;
      if (!isHyper) return;
      if (event.key.toLowerCase() !== "a") return;
      event.preventDefault();
      handleTabClick("agent");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTabClick]);

  return (
    <aside className={`author-panel${isMinimized ? " author-panel--minimized" : ""}`}>
      <div className="author-panel__tabs" role="tablist" aria-label="Author panel">
        <button
          type="button"
          className={`author-panel__tab${activeTab === "configuration" ? " is-active" : ""}`}
          onClick={() => handleTabClick("configuration")}
          aria-pressed={activeTab === "configuration"}
        >
          Configuration
        </button>
        <span className="author-panel__divider" aria-hidden="true">
          |
        </span>
        <button
          type="button"
          className={`author-panel__tab${activeTab === "agent" ? " is-active" : ""}`}
          onClick={() => handleTabClick("agent")}
          aria-pressed={activeTab === "agent"}
        >
          Agent
        </button>
      </div>
      {isMinimized ? null : (
        <div className="author-panel__content">
          {activeTab === "configuration" ? <ConfigurationPanel /> : <AIAssistantPanel />}
        </div>
      )}
    </aside>
  );
}
