import { getResolvedViewByPath } from "@/lib/content/views.server";
import { loadMetadataSnapshot } from "@/lib/content/metadata";
import { isViewContainer } from "@/lib/content/containers";
import { ViewRenderer } from "@/components/views/ViewRenderer";
import { NotFoundView } from "@/components/views/NotFoundView";
import { buildVocabSegments, loadTerminology } from "@/lib/content/terminology";

export default async function ViewPage({
  params
}: {
  params: { viewPath?: string[] };
}) {
  const resolved = await getResolvedViewByPath(params.viewPath ?? []);

  if (!resolved) {
    return <NotFoundView />;
  }
  const terminology = await loadTerminology();
  const vocabSegments = buildVocabSegments(
    resolved,
    terminology,
    (resolved.config as { active_vocab_terms?: unknown }).active_vocab_terms
  );

  return <ViewRenderer view={resolved} vocabSegments={vocabSegments} />;
}

export async function generateStaticParams() {
  if (process.env.NEXT_PUBLIC_BUILD_MODE !== "publish") {
    return [];
  }

  const metadata = await loadMetadataSnapshot();
  if (!metadata) return [];

  const components = new Map(
    Object.values(metadata.components)
      .flat()
      .map((comp) => [
        (comp as { comp_id: number }).comp_id,
        comp as { comp_id: number; type: string; config: Record<string, unknown> }
      ])
  );

  const refs = metadata.references as { ref_id: number; comp_id: number; overrides?: Record<string, unknown> }[];
  const views = refs
    .map((ref) => {
      const component = components.get(ref.comp_id);
      if (!component) return null;
      if (!isViewContainer(component.type, component.config ?? {})) return null;
      const config = { ...component.config, ...(ref.overrides ?? {}) } as { path?: string };
      return config;
    })
    .filter(Boolean) as { path?: string }[];

  const params = views.map((view) => {
    const path = view.path ?? "/";
    const segments = path === "/" ? [] : path.replace(/^\//, "").split("/");
    return { viewPath: segments };
  });

  const home = metadata.settings?.home as { root_view_node_id?: number | null } | undefined;
  const hasRoot = views.some((view) => view.path === "/");
  if (home?.root_view_node_id && !hasRoot) {
    params.push({ viewPath: [] });
  }

  return params;
}
