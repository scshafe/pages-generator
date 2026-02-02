import type { ResolvedNode } from "@/lib/content/types";
import { ViewComponentRenderer } from "@/components/views/ViewComponentRenderer";
import { DragScopeProvider } from "@/components/views/DragScopeProvider";
import { ViewChildrenSortable } from "@/components/views/ViewChildrenSortable";
import { ContainerFocusProvider } from "@/components/author/ContainerFocusProvider";
import { ConfigurationPanel } from "@/components/author/ConfigurationPanel";
import { AuthorShortcuts } from "@/components/views/AuthorShortcuts";
import { EditableViewTitle } from "@/components/views/EditableViewTitle";
import { ViewEdgeComposer } from "@/components/views/ViewEdgeComposer";

export function ViewRenderer({ view }: { view: ResolvedNode }) {
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  return (
    <section className="surface hero">
      <header>
        <EditableViewTitle nodeId={view.node.node_id} config={view.config} isAuthor={isAuthor} />
        {view.config.description ? (
          <p>{String(view.config.description)}</p>
        ) : null}
      </header>
      <ContainerFocusProvider>
        <DragScopeProvider>
          {isAuthor ? <AuthorShortcuts /> : null}
          <div className="section">
            {isAuthor ? (
              <>
                <ViewEdgeComposer
                  viewNodeId={view.node.node_id}
                  position="start"
                  beforeNodeId={view.children[0]?.node.node_id ?? null}
                />
                <ViewChildrenSortable
                  nodes={view.children}
                  containerNodeId={view.node.node_id}
                  containerConfig={view.config as Record<string, unknown>}
                />
                {view.children.length > 0 ? (
                  <ViewEdgeComposer viewNodeId={view.node.node_id} position="end" />
                ) : null}
              </>
            ) : (
              view.children.map((child, index) => (
                <ViewComponentRenderer
                  key={child.node.node_id}
                  node={child}
                  parentType="Container"
                  previousSiblingType={view.children[index - 1]?.component.type ?? null}
                  nextSiblingType={view.children[index + 1]?.component.type ?? null}
                />
              ))
            )}
          </div>
        </DragScopeProvider>
        {isAuthor ? <ConfigurationPanel /> : null}
      </ContainerFocusProvider>
    </section>
  );
}
