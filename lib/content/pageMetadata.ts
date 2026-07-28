import type { Metadata } from "next";
import type { SiteSettings } from "@/lib/content/types";

export const FALLBACK_SITE_TITLE = "Studio Notebook";

type PageMetadataInput = {
  /** Page-specific title; falls back to the site title when empty. */
  pageTitle?: string;
  /** Page-specific description; falls back to site description/tagline. */
  description?: string;
  /** Normalized pathname ("/" for the root view). */
  pathname: string;
};

// Per-page metadata. Next merges metadata objects per top-level key, so the
// openGraph/twitter blocks must be complete here — partial blocks would
// discard the layout-level ones instead of extending them.
export function buildPageMetadata(
  site: SiteSettings,
  { pageTitle, description, pathname }: PageMetadataInput
): Metadata {
  const siteTitle = site.site_name || FALLBACK_SITE_TITLE;
  const isRoot = pathname === "/";
  const useOwnTitle = Boolean(pageTitle) && !isRoot && pageTitle !== siteTitle;
  const fullTitle = useOwnTitle ? `${pageTitle} · ${siteTitle}` : siteTitle;
  const resolvedDescription =
    description || site.description || site.tagline || undefined;
  const images = site.social_image_url ? [site.social_image_url] : undefined;

  return {
    title: useOwnTitle ? pageTitle : { absolute: siteTitle },
    description: resolvedDescription,
    alternates: { canonical: pathname },
    openGraph: {
      title: fullTitle,
      description: resolvedDescription,
      url: pathname,
      siteName: site.site_name || undefined,
      images,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: resolvedDescription,
      images
    }
  };
}
