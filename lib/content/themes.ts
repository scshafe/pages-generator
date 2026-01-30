import { apiFetch } from "@/lib/api/client";
import { loadMetadataSnapshot } from "@/lib/content/metadata";
import type { ThemeDefinition } from "@/lib/content/types";

const buildMode = process.env.NEXT_PUBLIC_BUILD_MODE;

export async function getThemes(): Promise<ThemeDefinition[]> {
  if (buildMode === "publish") {
    const metadata = await loadMetadataSnapshot();
    return (metadata?.settings.themes as ThemeDefinition[]) ?? [];
  }

  return apiFetch<ThemeDefinition[]>("/themes");
}
