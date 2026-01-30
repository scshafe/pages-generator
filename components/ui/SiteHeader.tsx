import Link from "next/link";
import { getNavigation } from "@/lib/content/navigation";
import { getHomeSettings } from "@/lib/content/navigation";
import { HomeIcon, SettingsIcon } from "@/components/ui/icons";

export async function SiteHeader() {
  const [navigation, home] = await Promise.all([getNavigation(), getHomeSettings()]);
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";

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
            {navigation.menu.map((item) => (
              <Link key={item.menu_id} className="nav-link" href={item.href}>
                {item.label === "Settings" ? (
                  <>
                    <SettingsIcon size={24} strokeWidth={2} aria-hidden />
                    <span className="sr-only">Settings</span>
                  </>
                ) : (
                  <span>{item.label}</span>
                )}
              </Link>
            ))}
          </nav>
        </div>
    </header>
  );
}
