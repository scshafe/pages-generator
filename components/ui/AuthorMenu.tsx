"use client";

import { useEffect, useState } from "react";
import { MenuIcon } from "@/components/ui/icons";

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
    <div className="nav-menu" aria-label="Author menu">
      <button
        className="nav-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded="false"
      >
        <MenuIcon size={24} strokeWidth={2} aria-hidden />
        <span className="sr-only">Author menu</span>
      </button>
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
    </div>
  );
}
