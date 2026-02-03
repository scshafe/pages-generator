"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/blogcomponents/ui/navigation-menu";
import { useContainerFocus } from "@/blogcomponents/author/ContainerFocusProvider";
import { getThemeModeSnapshot } from "@/blogcomponents/author/themeModeUtils";
import { apiFetch } from "@/lib/api/client";
import { settingsTabs } from "@/lib/content/settingsTabs";
import { AuthorMenu } from "@/blogcomponents/ui/AuthorMenu";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import type { ResolvedNode } from "@/lib/content/types";

export function AuthorHeader() {
  const { focusedNodeId } = useContainerFocus();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [focusedType, setFocusedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOutlines, setShowOutlines] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const isPublishViewExample = useMemo(() => {
    if (!pathname) return false;
    const normalized = pathname.toLowerCase();
    return normalized === "/publishviewexample" || normalized === "/publish-view-example";
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (showOutlines) {
      root.classList.add("outline-mode");
    } else {
      root.classList.remove("outline-mode");
    }
    return () => root.classList.remove("outline-mode");
  }, [showOutlines]);

  useEffect(() => {
    const handleToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ value?: boolean }>).detail;
      if (typeof detail?.value === "boolean") {
        setShowOutlines(detail.value);
        return;
      }
      setShowOutlines((prev) => !prev);
    };
    window.addEventListener("author-outlines-toggle", handleToggle);
    return () => window.removeEventListener("author-outlines-toggle", handleToggle);
  }, []);

  useEffect(() => {
    if (!focusedNodeId) {
      setFocusedType(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setFocusedType(null);
    setIsLoading(true);
    apiFetch<ResolvedNode>(`/nodes/${focusedNodeId}/resolved`)
      .then((data) => {
        if (!isActive) return;
        setFocusedType(data?.component?.type ?? null);
      })
      .catch(() => {
        if (!isActive) return;
        setFocusedType(null);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [focusedNodeId]);

  const focusLabel = !focusedNodeId
    ? "View"
    : isLoading
      ? "Loading..."
      : focusedType ?? "Unavailable";

  const handleSaveTheme = async () => {
    if (isSavingTheme) return;
    setIsSavingTheme(true);
    try {
      const snapshot = getThemeModeSnapshot();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const name = `PublishViewExample ${timestamp}`;
      const colors = {
        background: snapshot.general.backgroundColor,
        foreground: snapshot.general.textColor,
        primary: snapshot.header.textColor,
        secondary: snapshot.footer.textColor,
        accent: snapshot.header.backgroundColor,
        muted: snapshot.view.backgroundColor,
        border: snapshot.general.borderColor
      };
      await apiFetch("/themes/custom", {
        method: "POST",
        body: JSON.stringify({ name, colors })
      });
      toast.push("Theme saved", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to save theme", "error");
    } finally {
      setIsSavingTheme(false);
    }
  };

  return (
    <header className="author-header">
      <div className="author-header-inner container">
        <div className="author-nav">
          <div className="author-mode-group">
            <span className="author-pill">
              Theme Mode
            </span>
            <span className="author-pill author-pill--neutral">
              {focusLabel}
            </span>
          </div>
          {isPublishViewExample ? (
            <div className="nav author-header-actions">
              <button
                className="button save-button"
                type="button"
                onClick={handleSaveTheme}
                disabled={isSavingTheme}
              >
                {isSavingTheme ? "Saving..." : "Save"}
              </button>
              <button
                className="button ghost"
                type="button"
                onClick={() => router.push("/settings?tab=theme")}
              >
                Back
              </button>
            </div>
          ) : (
            <NavigationMenu className="nav-menu-root" aria-label="Author">
              <NavigationMenuList className="nav nav-menu-list author-nav-list">
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="nav-menu-trigger">Settings</NavigationMenuTrigger>
                  <NavigationMenuContent className="nav-menu-content">
                    <div className="nav-menu-dropdown" role="menu">
                      {settingsTabs.map((tab) => (
                        <NavigationMenuLink key={tab.id} asChild>
                          <Link className="nav-menu-dropdown__link" href={`/settings?tab=${tab.id}`}>
                            {tab.label}
                          </Link>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <AuthorMenu />
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>
      </div>
    </header>
  );
}
