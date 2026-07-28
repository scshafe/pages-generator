import { apiFetch } from "@/lib/api/client";
import { loadMetadataSnapshot } from "@/lib/content/metadata";
import type { SiteSettings } from "@/lib/content/types";

const buildMode = process.env.NEXT_PUBLIC_BUILD_MODE;

const defaultSiteSettings: SiteSettings = {
  site_name: "",
  tagline: "",
  site_url: "",
  description: "",
  keywords: "",
  author: "",
  language: "en",
  theme_color: "#1f3b56",
  twitter_handle: "",
  social_image_url: "",
  social_image_border_enabled: false,
  social_image_border_color: "#0f172a",
  social_image_border_width: 16,
  social_image_border_radius: 24,
  robots: "index,follow",
  favicon_src: ""
};

export async function getSiteSettings(): Promise<SiteSettings> {
  if (buildMode === "publish") {
    const metadata = await loadMetadataSnapshot();
    const site = (metadata?.settings.site as SiteSettings | undefined) ?? {};
    return { ...defaultSiteSettings, ...site };
  }

  const site = await apiFetch<SiteSettings>("/site");
  return { ...defaultSiteSettings, ...site };
}
