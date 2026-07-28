import type { Metadata } from "next";
import { getResolvedViewByPath } from "@/lib/content/views.server";
import { loadMetadataSnapshot } from "@/lib/content/metadata";
import { isViewContainer } from "@/lib/content/containers";
import { isReservedViewPath, viewPathSegments } from "@/lib/content/paths";
import { buildPageMetadata } from "@/lib/content/pageMetadata";
import { getSiteSettings } from "@/lib/content/site";
import { ViewRenderer } from "@/blogcomponents/views/ViewRenderer";
import { NotFoundView } from "@/blogcomponents/views/NotFoundView";
import { buildVocabSegments, loadTerminology } from "@/lib/content/terminology";

export async function generateMetadata({
  params
}: {
  params: { viewPath?: string[] };
}): Promise<Metadata> {
  const segments = params.viewPath ?? [];
  const resolved = await getResolvedViewByPath(segments);
  if (!resolved) return {};

  const site = await getSiteSettings();
  const config = resolved.config as {
    browser_title?: string;
    title?: string;
    name?: string;
    description?: string;
  };

  return buildPageMetadata(site, {
    pageTitle: config.browser_title || config.title || config.name,
    description: config.description,
    pathname: segments.length ? `/${segments.join("/")}` : "/"
  });
}

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

  const seen = new Set<string>();
  const params: { viewPath: string[] }[] = [];
  for (const view of views) {
    if (isReservedViewPath(view.path)) continue;
    const segments = viewPathSegments(view.path);
    const key = segments.join("/");
    if (seen.has(key)) continue;
    seen.add(key);
    params.push({ viewPath: segments });
  }

  const home = metadata.settings?.home as { root_view_node_id?: number | null } | undefined;
  if (home?.root_view_node_id && !seen.has("")) {
    params.push({ viewPath: [] });
  }

  return params;
}
