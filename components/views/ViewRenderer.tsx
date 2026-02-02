"use client";

import type { ResolvedNode } from "@/lib/content/types";
import { DragScopeProvider } from "@/components/views/DragScopeProvider";
import { SortableChildren, ViewComponentRenderer, renderInlineBlocks } from "@/components/views/ViewComponentRenderer";
import { ContainerFocusProvider } from "@/components/author/ContainerFocusProvider";
import { ConfigurationPanel } from "@/components/author/ConfigurationPanel";
import { AuthorShortcuts } from "@/components/views/AuthorShortcuts";
import { EditableViewTitle } from "@/components/views/EditableViewTitle";
import { EdgeMarker } from "@/components/views/EdgeMarker";

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
                <EdgeMarker
                  scopeId={view.node.node_id}
                  scopeType="view"
                  position="start"
                  beforeNodeId={view.children[0]?.node.node_id ?? null}
                />
                <SortableChildren
                  nodes={view.children}
                  enabled={isAuthor}
                  containerNodeId={view.node.node_id}
                  containerType="Container"
                  containerConfig={view.config as Record<string, unknown>}
                  isCompatible={() => true}
                  renderNode={(child: ResolvedNode, index: number, siblings: ResolvedNode[]) => (
                    <ViewComponentRenderer
                      key={child.node.node_id}
                      node={child}
                      parentType="Container"
                      previousSiblingType={siblings[index - 1]?.component.type ?? null}
                      nextSiblingType={siblings[index + 1]?.component.type ?? null}
                    />
                  )}
                />
                {view.children.length > 0 ? (
                  <EdgeMarker scopeId={view.node.node_id} scopeType="view" position="end" />
                ) : null}
              </>
            ) : (
              renderInlineBlocks({
                nodes: view.children,
                renderItem: (child, index, siblings) => (
                  <ViewComponentRenderer
                    key={child.node.node_id}
                    node={child}
                    parentType="Container"
                    previousSiblingType={siblings[index - 1]?.component.type ?? null}
                    nextSiblingType={siblings[index + 1]?.component.type ?? null}
                  />
                ),
                isAuthor
              })
            )}
          </div>
        </DragScopeProvider>
        {isAuthor ? <ConfigurationPanel /> : null}
      </ContainerFocusProvider>
    </section>
  );
}
