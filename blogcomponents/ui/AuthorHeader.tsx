"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/blogcomponents/ui/navigation-menu";
import { useContainerFocus } from "@/blogcomponents/author/ContainerFocusProvider";
import { apiFetch } from "@/lib/api/client";
import { settingsTabs } from "@/lib/content/settingsTabs";
import { AuthorMenu } from "@/blogcomponents/ui/AuthorMenu";
import type { ResolvedNode } from "@/lib/content/types";

export function AuthorHeader() {
  const { focusedNodeId } = useContainerFocus();
  const [focusedType, setFocusedType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOutlines, setShowOutlines] = useState(false);

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

  return (
    <header className="author-header">
      <div className="author-header-inner container">
        <div className="author-nav">
          <div className="author-mode-group">
            <span className="author-pill">
              Author Mode
            </span>
            <span className="author-pill author-pill--neutral">
              {focusLabel}
            </span>
          </div>
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
        </div>
      </div>
    </header>
  );
}
