import { apiFetch } from "@/lib/api/client";
import { loadMetadataSnapshot } from "@/lib/content/metadata";
import { isViewContainer } from "@/lib/content/containers";
import { normalizeViewPath } from "@/lib/content/paths";
import { getPublishViewExample } from "@/lib/content/publishViewExample";
import type {
  ComponentRecord,
  NodeRecord,
  ReferenceRecord,
  ResolvedNode
} from "@/lib/content/types";

const buildMode = process.env.NEXT_PUBLIC_BUILD_MODE;

function mergeConfig(component: ComponentRecord, reference: ReferenceRecord) {
  return { ...component.config, ...(reference.overrides ?? {}) } as Record<string, unknown>;
}

function resolveNodeTree(
  nodeId: number,
  nodes: Map<number, NodeRecord>,
  references: Map<number, ReferenceRecord>,
  components: Map<number, ComponentRecord>
): ResolvedNode | null {
  const node = nodes.get(nodeId);
  if (!node) return null;
  const reference = references.get(node.ref_id);
  if (!reference) return null;
  const component = components.get(reference.comp_id);
  if (!component) return null;

  const resolved: ResolvedNode = {
    node,
    reference,
    component,
    config: mergeConfig(component, reference),
    children: []
  };

  const childNodeId = (component.config as { child_node_id?: number }).child_node_id;
  if (childNodeId) {
    let cursor: number | null | undefined = childNodeId;
    while (cursor) {
      const childResolved = resolveNodeTree(cursor, nodes, references, components);
      if (childResolved) {
        resolved.children.push(childResolved);
      }
      const cursorNode = nodes.get(cursor);
      cursor = cursorNode?.next_node_id ?? null;
    }
  }

  return resolved;
}

async function resolveViewByPathStatic(pathname: string): Promise<ResolvedNode | null> {
  const metadata = await loadMetadataSnapshot();
  if (!metadata) return null;

  const nodes = new Map<number, NodeRecord>(
    (metadata.nodes as NodeRecord[]).map((node) => [node.node_id, node])
  );
  const references = new Map<number, ReferenceRecord>(
    (metadata.references as ReferenceRecord[]).map((ref) => [ref.ref_id, ref])
  );

  const componentsList = Object.values(metadata.components).flat() as ComponentRecord[];
  const components = new Map<number, ComponentRecord>(
    componentsList.map((comp) => [comp.comp_id, comp])
  );

  const matchRef = Array.from(references.values()).find((ref) => {
    const component = components.get(ref.comp_id);
    if (!component) {
      return false;
    }
    if (!isViewContainer(component.type, component.config ?? {})) {
      return false;
    }
    const config = mergeConfig(component, ref);
    return normalizeViewPath(config.path as string | undefined) === pathname;
  });

  if (!matchRef) {
    const home = metadata.settings.home as { root_view_node_id?: number | null };
    if (pathname === "/" && home?.root_view_node_id) {
      return resolveNodeTree(home.root_view_node_id, nodes, references, components);
    }
    return null;
  }

  return resolveNodeTree(matchRef.node_id, nodes, references, components);
}

async function resolveViewByPathAuthor(pathname: string): Promise<ResolvedNode | null> {
  const views = await apiFetch<{ node_id: number | null; config: { path?: string } }[]>("/views");
  const match = views.find((view) => normalizeViewPath(view.config.path) === pathname);

  if (!match) {
    if (pathname === "/") {
      const home = await apiFetch<{ root_view_node_id?: number | null }>("/home/root-view");
      if (home.root_view_node_id) {
        return apiFetch<ResolvedNode>(`/nodes/${home.root_view_node_id}/resolved`);
      }
    }
    return null;
  }

  if (!match.node_id) return null;
  return apiFetch<ResolvedNode>(`/nodes/${match.node_id}/resolved`);
}

export async function getResolvedViewByPath(viewPath: string[]): Promise<ResolvedNode | null> {
  const pathname = normalizeViewPath(`/${viewPath.join("/")}`);

  if (pathname.toLowerCase() === "/publishviewexample" || pathname.toLowerCase() === "/publish-view-example") {
    return getPublishViewExample();
  }

  if (buildMode === "publish") {
    return resolveViewByPathStatic(pathname);
  }

  return resolveViewByPathAuthor(pathname);
}
