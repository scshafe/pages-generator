import { getResolvedViewByPath } from "@/lib/content/views.server";
import { loadMetadataSnapshot } from "@/lib/content/metadata";
import { ViewRenderer } from "@/components/views/ViewRenderer";
import { NotFoundView } from "@/components/views/NotFoundView";

export default async function ViewPage({
  params
}: {
  params: { viewPath?: string[] };
}) {
  const resolved = await getResolvedViewByPath(params.viewPath ?? []);

  if (!resolved) {
    return <NotFoundView />;
  }

  return <ViewRenderer view={resolved} />;
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
      if (!component || component.type !== "ViewContainer") return null;
      const config = { ...component.config, ...(ref.overrides ?? {}) } as { path?: string };
      return config;
    })
    .filter(Boolean) as { path?: string }[];

  return views.map((view) => {
    const path = view.path ?? "/";
    const segments = path === "/" ? [] : path.replace(/^\//, "").split("/");
    return { viewPath: segments };
  });
}
