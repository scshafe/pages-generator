"use client";

import { useEffect } from "react";
import type { ResolvedNode } from "@/lib/content/types";
import { DragScopeProvider } from "@/blogcomponents/views/DragScopeProvider";
import { SortableChildren, ViewComponentRenderer, renderInlineBlocks } from "@/blogcomponents/views/ViewComponentRenderer";
import { VocabProvider } from "@/blogcomponents/views/VocabProvider";
import { useContainerFocus } from "@/blogcomponents/author/ContainerFocusProvider";
import { AuthorShortcuts } from "@/blogcomponents/views/AuthorShortcuts";
import { ViewHeader } from "@/blogcomponents/views/ViewHeader";
import type { VocabSegment } from "@/lib/content/terminology.types";

export function ViewRenderer({
  view,
  vocabSegments
}: {
  view: ResolvedNode;
  vocabSegments?: Record<number, VocabSegment[]>;
}) {
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const { setFocusedNodeId } = useContainerFocus();

  useEffect(() => {
    setFocusedNodeId(null);
  }, [setFocusedNodeId, view.node.node_id]);
  return (
    <section className="surface hero">
      <VocabProvider segmentsByNodeId={vocabSegments ?? {}}>
        <ViewHeader view={view} isAuthor={isAuthor} />
        <DragScopeProvider>
          {isAuthor ? <AuthorShortcuts /> : null}
          <div className="section">
            {isAuthor ? (
              <>
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
      </VocabProvider>
    </section>
  );
}
