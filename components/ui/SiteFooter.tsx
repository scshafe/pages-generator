import { getNavigation } from "@/lib/content/navigation";

import { CopyrightIcon } from "@/components/ui/icons";

export async function SiteFooter() {
  const navigation = await getNavigation();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <CopyrightIcon size={16} aria-hidden />
          <span>{year} Studio Notebook</span>
        </div>
        <div className="nav" aria-label="Footer">
          {navigation.footer.map((item) => (
            <a key={item.footer_id} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
