import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4 } from "next/font/google";
import { SiteHeader } from "@/blogcomponents/ui/SiteHeader";
import { AuthorHeader } from "@/blogcomponents/ui/AuthorHeader";
import { SiteFooter } from "@/blogcomponents/ui/SiteFooter";
import { ToastProvider } from "@/blogcomponents/ui/ToastProvider";
import { ContainerFocusProvider } from "@/blogcomponents/author/ContainerFocusProvider";
import { AuthorPanelGate } from "@/blogcomponents/author/AuthorPanelGate";
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
      siteName: site.site_name || undefined,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: site.social_image_url ? [site.social_image_url] : undefined
    },
    keywords: site.keywords || undefined,
    authors: site.author ? [{ name: site.author }] : undefined,
    themeColor: site.theme_color || undefined
  };
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const site = await getSiteSettings();
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  return (
    <html lang={site.language || "en"} className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className={isAuthor ? "author-mode" : undefined}>
        <ToastProvider>
          <ContainerFocusProvider>
            {isAuthor ? <AuthorHeader /> : null}
            <SiteHeader />
            <main>
              <div className="container">{children}</div>
            </main>
            <SiteFooter />
            {isAuthor ? <AuthorPanelGate /> : null}
          </ContainerFocusProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
