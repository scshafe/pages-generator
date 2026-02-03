import { getNavigation } from "@/lib/content/navigation";

export async function SiteFooter() {
  const navigation = await getNavigation();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <a className="footer-brand" href="https://github.com/scshafe/pages-generator">
          <span>Powered by pages-generator</span>
        </a>
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
