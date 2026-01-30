import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { getSiteSettings } from "@/lib/content/site";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

const bodyFont = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"]
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const title = site.site_name || "Studio Notebook";
  const description = site.description || site.tagline || "A structured, composable blog with author mode.";
  const url = site.site_url ? new URL(site.site_url) : undefined;
  const favicon = site.favicon_src || undefined;

  return {
    title,
    description,
    metadataBase: url,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: {
      title,
      description,
      url: site.site_url || undefined,
      images: site.social_image_url ? [site.social_image_url] : undefined,
      type: "website"
    },
    twitter: {
      title,
      description,
      images: site.social_image_url ? [site.social_image_url] : undefined
    }
  };
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const site = await getSiteSettings();
  return (
    <html lang={site.language || "en"} className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>
        <ToastProvider>
          <SiteHeader />
          <main>
            <div className="container">{children}</div>
          </main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
