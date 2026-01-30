import { apiFetch } from "@/lib/api/client";
import { loadMetadataSnapshot } from "@/lib/content/metadata";
import type { FooterItem, HomeSettings, MenuItem } from "@/lib/content/types";

const buildMode = process.env.NEXT_PUBLIC_BUILD_MODE;

export async function getNavigation(): Promise<{ menu: MenuItem[]; footer: FooterItem[] }> {
  if (buildMode === "publish") {
    const metadata = await loadMetadataSnapshot();
    if (!metadata) {
      return { menu: [], footer: [] };
    }
    return {
      menu: (metadata.settings.menu as MenuItem[]) ?? [],
      footer: (metadata.settings.footer as FooterItem[]) ?? []
    };
  }

  const navigation = await apiFetch<{ menu: MenuItem[]; footer: FooterItem[] }>("/navigation");
  const menu = [...navigation.menu];
  menu.push({
    menu_id: 0,
    label: "Settings",
    href: "/settings",
    order: 999,
    position: "right"
  });
  return { menu, footer: navigation.footer };
}

export async function getHomeSettings(): Promise<HomeSettings> {
  if (buildMode === "publish") {
    const metadata = await loadMetadataSnapshot();
    return (metadata?.settings.home as HomeSettings) ?? { label: "Home" };
  }

  return apiFetch<HomeSettings>("/home");
}
