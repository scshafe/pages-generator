"use client";

import Link from "next/link";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger
} from "@/blogcomponents/ui/navigation-menu";

export function AuthorMenu() {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="nav-menu-trigger">Menu</NavigationMenuTrigger>
      <NavigationMenuContent className="nav-menu-content">
        <div className="nav-menu-dropdown" role="menu">
          <NavigationMenuLink asChild>
            <Link className="nav-menu-dropdown__link" href="/terminology">
              Terminology
            </Link>
          </NavigationMenuLink>
          <NavigationMenuLink asChild>
            <Link className="nav-menu-dropdown__link" href="/views">
              Views
            </Link>
          </NavigationMenuLink>
          <button type="button" role="menuitem">
            Notes
          </button>
          <button type="button" role="menuitem">
            Sources
          </button>
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}
