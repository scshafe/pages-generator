import { apiFetch } from "@/lib/api/client";
import { loadMetadataSnapshot } from "@/lib/content/metadata";
import { isViewContainer } from "@/lib/content/containers";
import type {
  ComponentRecord,
  FooterItem,
  HomeSettings,
  MenuItem,
  NodeRecord,
  ReferenceRecord,
  ViewSummary
} from "@/lib/content/types";

const buildMode = process.env.NEXT_PUBLIC_BUILD_MODE;

type ViewLookup = {
  label: string;
  href: string;
};

function resolveViewLabel(config: { title?: string; name?: string; path?: string }) {
  return config.title ?? config.name ?? config.path ?? "Untitled";
}

function resolveViewHref(config: { path?: string }) {
  return config.path ?? "/";
}

function applyViewRefs<T extends MenuItem | FooterItem>(
  items: T[],
  viewMap: Map<number, ViewLookup>
): T[] {
  return items.map((item) => {
    if (!item.view_node_id) return item;
    const resolved = viewMap.get(item.view_node_id);
    if (!resolved) return item;
    return {
      ...item,
      label: resolved.label,
      href: resolved.href
    };
  });
}

function buildViewMapFromMetadata(metadata: {
  nodes: NodeRecord[];
  references: ReferenceRecord[];
  components: Record<string, ComponentRecord[]>;
}) {
  const nodes = new Map<number, NodeRecord>(metadata.nodes.map((node) => [node.node_id, node]));
  const references = new Map<number, ReferenceRecord>(
    metadata.references.map((ref) => [ref.ref_id, ref])
  );
  const componentsList = Object.values(metadata.components).flat() as ComponentRecord[];
  const components = new Map<number, ComponentRecord>(
    componentsList.map((comp) => [comp.comp_id, comp])
  );
  const viewMap = new Map<number, ViewLookup>();

  for (const node of nodes.values()) {
    const ref = references.get(node.ref_id);
    if (!ref) continue;
    const comp = components.get(ref.comp_id);
    if (!comp) continue;
    if (!isViewContainer(comp.type, comp.config ?? {})) continue;
    const config = { ...comp.config, ...(ref.overrides ?? {}) } as {
      title?: string;
      name?: string;
      path?: string;
    };
    viewMap.set(node.node_id, {
      label: resolveViewLabel(config),
      href: resolveViewHref(config)
    });
  }

  return viewMap;
}

async function buildViewMapFromApi(): Promise<Map<number, ViewLookup>> {
  const views = await apiFetch<ViewSummary[]>("/views");
  const viewMap = new Map<number, ViewLookup>();
  for (const view of views) {
    if (!view.node_id) continue;
    viewMap.set(view.node_id, {
      label: resolveViewLabel(view.config),
      href: resolveViewHref(view.config)
    });
  }
  return viewMap;
}

export async function getNavigation(): Promise<{ menu: MenuItem[]; footer: FooterItem[] }> {
  if (buildMode === "publish") {
    const metadata = await loadMetadataSnapshot();
    if (!metadata) {
      return { menu: [], footer: [] };
    }
    const menu = (metadata.settings.menu as MenuItem[]) ?? [];
    const footer = (metadata.settings.footer as FooterItem[]) ?? [];
    const viewMap = buildViewMapFromMetadata({
      nodes: metadata.nodes as NodeRecord[],
      references: metadata.references as ReferenceRecord[],
      components: metadata.components as Record<string, ComponentRecord[]>
    });
    return {
      menu: applyViewRefs(menu, viewMap),
      footer: applyViewRefs(footer, viewMap)
    };
  }

  const navigation = await apiFetch<{ menu: MenuItem[]; footer: FooterItem[] }>("/navigation");
  const viewMap = await buildViewMapFromApi();
  const menu = [...navigation.menu];
  menu.push({
    menu_id: 0,
    label: "Settings",
    href: "/settings",
    order: 999,
    position: "right"
  });
  return {
    menu: applyViewRefs(menu, viewMap),
    footer: applyViewRefs(navigation.footer, viewMap)
  };
}

export async function getHomeSettings(): Promise<HomeSettings> {
  if (buildMode === "publish") {
    const metadata = await loadMetadataSnapshot();
    return (metadata?.settings.home as HomeSettings) ?? { label: "Home" };
  }

  return apiFetch<HomeSettings>("/home");
}
