import type { ResolvedNode } from "@/lib/content/types";
import { ViewComponentRenderer } from "@/components/views/ViewComponentRenderer";
import { AddComponentModalButton } from "@/components/author/AddComponentModalButton";
import { DragScopeProvider } from "@/components/views/DragScopeProvider";

export function ViewRenderer({ view }: { view: ResolvedNode }) {
  return (
    <section className="surface hero">
      <header>
        <h1>{String(view.config.title ?? view.config.name ?? "Untitled view")}</h1>
        {view.config.description ? (
          <p>{String(view.config.description)}</p>
        ) : null}
      </header>
      <DragScopeProvider>
        <div className="section">
          {view.children.map((child) => (
            <ViewComponentRenderer key={child.node.node_id} node={child} />
          ))}
        </div>
        {process.env.NEXT_PUBLIC_BUILD_MODE === "author" ? (
          <AddComponentModalButton parentNodeId={view.node.node_id} />
        ) : null}
      </DragScopeProvider>
    </section>
  );
}
