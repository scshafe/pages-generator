import Link from "next/link";
import { getNavigation } from "@/lib/content/navigation";
import { getHomeSettings } from "@/lib/content/navigation";
import { HomeIcon } from "@/components/ui/icons";
import { AuthorMenu } from "@/components/ui/AuthorMenu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger
} from "@/components/ui/navigation-menu";
import { settingsTabs } from "@/lib/content/settingsTabs";

export async function SiteHeader() {
  const [navigation, home] = await Promise.all([getNavigation(), getHomeSettings()]);
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const settingsItem = navigation.menu.find((item) => item.label === "Settings");
  const navItems = navigation.menu.filter((item) => item.label !== "Settings");

  return (
    <header className="header">
        <div className="header-inner container">
          <div className="brand-group">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden>
                <HomeIcon size={18} />
              </span>
              <span>{home.label}</span>
            </Link>
            {isAuthor ? <span className="author-pill">Author Mode</span> : null}
          </div>
          <NavigationMenu className="nav-menu-root" aria-label="Main">
            <NavigationMenuList className="nav nav-menu-list">
              {navItems.map((item) => (
                <NavigationMenuItem key={item.menu_id}>
                  <NavigationMenuLink asChild>
                    <Link className="nav-link nav-menu-link" href={item.href}>
                      <span>{item.label}</span>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
              {settingsItem ? (
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="nav-menu-trigger">Settings</NavigationMenuTrigger>
                  <NavigationMenuContent className="nav-menu-content">
                    <div className="nav-menu-dropdown" role="menu">
                      {settingsTabs.map((tab) => (
                        <NavigationMenuLink key={tab.id} asChild>
                          <Link
                            className="nav-menu-dropdown__link"
                            href={`/settings?tab=${tab.id}`}
                          >
                            {tab.label}
                          </Link>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : null}
              {isAuthor ? <AuthorMenu /> : null}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
    </header>
  );
}
