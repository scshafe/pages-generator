"use client";

"use client";

import { useEffect, useState } from "react";
import { NavigationMenuContent, NavigationMenuItem, NavigationMenuTrigger } from "@/components/ui/navigation-menu";

const outlineClass = "outline-mode";

export function AuthorMenu() {
  const [showOutlines, setShowOutlines] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (showOutlines) {
      root.classList.add(outlineClass);
    } else {
      root.classList.remove(outlineClass);
    }
    return () => root.classList.remove(outlineClass);
  }, [showOutlines]);

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="nav-menu-trigger">Menu</NavigationMenuTrigger>
      <NavigationMenuContent className="nav-menu-content">
        <div className="nav-menu-dropdown" role="menu">
          <button type="button" role="menuitem">
            Views
          </button>
          <button type="button" role="menuitem">
            Notes
          </button>
          <button type="button" role="menuitem">
            Sources
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={showOutlines}
            onClick={() => setShowOutlines((prev) => !prev)}
          >
            {showOutlines ? "Hide outlines" : "Show outlines"}
          </button>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}
