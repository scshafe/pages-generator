import { getNavigation } from "@/lib/content/navigation";

export async function SiteFooter() {
  const navigation = await getNavigation();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>Studio Notebook</div>
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
