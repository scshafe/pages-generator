"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ConfigurationPanel } from "@/blogcomponents/author/ConfigurationPanel";
import { AIAssistantPanel } from "@/blogcomponents/author/AIAssistantPanel";
import { AuthorShortcutsPanel } from "@/blogcomponents/author/AuthorShortcutsPanel";
import { AuthorCommandsPanel } from "@/blogcomponents/author/AuthorCommandsPanel";
import { isEditableTarget } from "@/blogcomponents/views/useFocusNavigator";

type PanelTab = "configuration" | "agent" | "shortcuts" | "commands";

const PANEL_STORAGE_KEY = "authorPanelHeight";
const PANEL_MIN_HEIGHT = 240;
const PANEL_MAX_OFFSET = 96;
const DEFAULT_PANEL_HEIGHT = 360;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function AuthorPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab | null>("configuration");
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const handleTabClick = useCallback((tab: PanelTab) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const isHyper = event.metaKey && event.ctrlKey && event.altKey && event.shiftKey;
      if (!isHyper) return;
      if (event.key.toLowerCase() !== "a") return;
      event.preventDefault();
      setActiveTab("agent");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handlePanelOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: PanelTab }>).detail;
      if (!detail?.tab) return;
      setActiveTab(detail.tab);
    };
    window.addEventListener("author-panel:open", handlePanelOpen);
    return () => window.removeEventListener("author-panel:open", handlePanelOpen);
  }, []);

  useEffect(() => {
    const stored =
      window.localStorage.getItem(PANEL_STORAGE_KEY) ?? window.localStorage.getItem("authorPanelSize");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { height?: number } | number;
      const height = typeof parsed === "number" ? parsed : parsed?.height;
      if (typeof height !== "number") return;
      const maxHeight = Math.max(PANEL_MIN_HEIGHT, window.innerHeight - PANEL_MAX_OFFSET);
      setPanelHeight(clamp(height, PANEL_MIN_HEIGHT, maxHeight));
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (!panelHeight) return;
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify({ height: panelHeight }));
  }, [panelHeight]);

  useEffect(() => {
    const root = document.body;
    const updateCssHeight = () => {
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      const measured = panelRef.current?.getBoundingClientRect().height;
      const baseHeight = activeTab
        ? panelHeight ?? measured ?? DEFAULT_PANEL_HEIGHT
        : 0;
      const height = Math.max(0, baseHeight + headerHeight);
      root.style.setProperty("--author-panel-height", `${Math.round(height)}px`);
    };
    updateCssHeight();
    const observer = new ResizeObserver(updateCssHeight);
    if (panelRef.current) observer.observe(panelRef.current);
    if (headerRef.current) observer.observe(headerRef.current);
    window.addEventListener("resize", updateCssHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCssHeight);
    };
  }, [activeTab, panelHeight]);

  useEffect(() => {
    const handleResize = () => {
      setPanelHeight((prev) => {
        if (prev === null) return prev;
        const maxHeight = Math.max(PANEL_MIN_HEIGHT, window.innerHeight - PANEL_MAX_OFFSET);
        return clamp(prev, PANEL_MIN_HEIGHT, maxHeight);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activeTab) return;
    if (event.button !== 0) return;
    const panel = panelRef.current;
    if (!panel) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = panel.getBoundingClientRect();
    const startY = event.clientY;
    const startHeight = rect.height;
    const maxHeight = Math.max(PANEL_MIN_HEIGHT, window.innerHeight - PANEL_MAX_OFFSET);
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const nextHeight = clamp(startHeight - deltaY, PANEL_MIN_HEIGHT, maxHeight);
      setPanelHeight(Math.round(nextHeight));
    };

    const handlePointerUp = () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, [activeTab]);

  const isCollapsed = activeTab === null;

  const renderTabs = (className?: string) => (
    <div className={className}>
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
      <span className="author-panel__divider" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        className={`author-panel__tab${activeTab === "shortcuts" ? " is-active" : ""}`}
        onClick={() => handleTabClick("shortcuts")}
        aria-pressed={activeTab === "shortcuts"}
      >
        Shortcuts
      </button>
      <span className="author-panel__divider" aria-hidden="true">
        |
      </span>
      <button
        type="button"
        className={`author-panel__tab${activeTab === "commands" ? " is-active" : ""}`}
        onClick={() => handleTabClick("commands")}
        aria-pressed={activeTab === "commands"}
      >
        Commands
      </button>
    </div>
  );

  return (
    <footer className="author-panel">
      <div
        className="author-panel-popover"
        ref={panelRef}
        data-collapsed={isCollapsed}
        style={
          isCollapsed
            ? { height: 0 }
            : panelHeight
              ? { height: panelHeight }
              : undefined
        }
      >
        <div
          className="author-panel-popover-header"
          role="tablist"
          aria-label="Author panel"
          ref={headerRef}
        >
          <div
            className="author-panel-resize-handle"
            onPointerDown={handleResizeStart}
            role="separator"
            aria-label="Resize author panel"
          >
            <span className="author-panel-resize-indicator" aria-hidden="true" />
          </div>
          {renderTabs("author-panel-buttons")}
        </div>
        {activeTab ? (
          <div className="author-panel__content">
            {activeTab === "configuration" ? (
              <ConfigurationPanel />
            ) : activeTab === "agent" ? (
              <AIAssistantPanel />
            ) : activeTab === "shortcuts" ? (
              <AuthorShortcutsPanel />
            ) : (
              <AuthorCommandsPanel />
            )}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
