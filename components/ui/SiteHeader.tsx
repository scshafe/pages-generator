import Link from "next/link";
import { getNavigation } from "@/lib/content/navigation";
import { getHomeSettings } from "@/lib/content/navigation";
import { HomeIcon, SettingsIcon } from "@/components/ui/icons";
import { AuthorMenu } from "@/components/ui/AuthorMenu";

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
          <nav className="nav" aria-label="Main">
            {navItems.map((item) => (
              <Link key={item.menu_id} className="nav-link" href={item.href}>
                <span>{item.label}</span>
              </Link>
            ))}
            {settingsItem ? (
              <Link key={settingsItem.menu_id} className="nav-link" href={settingsItem.href}>
                <SettingsIcon size={24} strokeWidth={2} aria-hidden />
                <span className="sr-only">Settings</span>
              </Link>
            ) : null}
            {isAuthor ? <AuthorMenu /> : null}
          </nav>
        </div>
    </header>
  );
}
