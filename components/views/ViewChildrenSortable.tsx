"use client";

import { useCallback } from "react";
import type { ResolvedNode } from "@/lib/content/types";
import { SortableChildren } from "@/components/views/ViewComponentRenderer";

export function ViewChildrenSortable({
  nodes,
  containerNodeId,
  containerConfig
}: {
  nodes: ResolvedNode[];
  containerNodeId: number;
  containerConfig: Record<string, unknown>;
}) {
  const isCompatible = useCallback(() => true, []);

  return (
    <SortableChildren
      nodes={nodes}
      enabled
      containerNodeId={containerNodeId}
      containerType="Container"
      containerConfig={containerConfig}
      isCompatible={isCompatible}
    />
  );
}
