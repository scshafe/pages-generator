import Link from "next/link";
import { getNavigation } from "@/lib/content/navigation";
import { getHomeSettings } from "@/lib/content/navigation";

export async function SiteHeader() {
  const [navigation, home] = await Promise.all([getNavigation(), getHomeSettings()]);
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";

  return (
    <header className="header">
      <div className="header-inner container">
        <div className="brand-group">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden />
            <span>{home.label}</span>
          </Link>
          {isAuthor ? <span className="author-pill">Author Mode</span> : null}
        </div>
        <nav className="nav" aria-label="Main">
          {navigation.menu.map((item) => (
            <Link key={item.menu_id} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
