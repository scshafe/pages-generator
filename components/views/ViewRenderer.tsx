import type { ResolvedNode } from "@/lib/content/types";
import { ViewComponentRenderer } from "@/components/views/ViewComponentRenderer";
import { AddComponentModalButton } from "@/components/author/AddComponentModalButton";
import { DragScopeProvider } from "@/components/views/DragScopeProvider";
import { ViewChildrenSortable } from "@/components/views/ViewChildrenSortable";

export function ViewRenderer({ view }: { view: ResolvedNode }) {
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
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
          {isAuthor ? (
            <ViewChildrenSortable
              nodes={view.children}
              containerNodeId={view.node.node_id}
              containerConfig={view.config as Record<string, unknown>}
            />
          ) : (
            view.children.map((child) => (
              <ViewComponentRenderer key={child.node.node_id} node={child} />
            ))
          )}
        </div>
        {isAuthor ? <AddComponentModalButton parentNodeId={view.node.node_id} /> : null}
      </DragScopeProvider>
    </section>
  );
}
