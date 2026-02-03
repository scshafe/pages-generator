import Link from "next/link";
import { getNavigation } from "@/lib/content/navigation";
import { getHomeSettings } from "@/lib/content/navigation";
import { HomeIcon } from "@/blogcomponents/ui/icons";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList
} from "@/blogcomponents/ui/navigation-menu";

export async function SiteHeader() {
  const [navigation, home] = await Promise.all([getNavigation(), getHomeSettings()]);
  const navItems = navigation.menu.filter((item) => item.label !== "Settings");

  return (
    <header className="header" data-nav-scope="header">
        <div className="header-inner container">
          <div className="brand-group">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden>
                <HomeIcon size={18} />
              </span>
              <span>{home.label}</span>
            </Link>
          </div>
          <NavigationMenu className="nav-menu-root" aria-label="Main">
            <NavigationMenuList className="nav nav-menu-list">
              {navItems.map((item) => (
                <NavigationMenuItem key={item.menu_id}>
                  <NavigationMenuLink asChild>
                    <Link
                      className="nav-link nav-menu-link"
                      href={item.href}
                      data-nav-id={`menu-${item.menu_id}`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
    </header>
  );
}
