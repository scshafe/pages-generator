"use client";

import { useCallback } from "react";
import { useContainerFocus } from "@/blogcomponents/author/ContainerFocusProvider";
import { EditableViewTitle } from "@/blogcomponents/views/EditableViewTitle";
import type { ResolvedNode } from "@/lib/content/types";

export function ViewHeader({ view, isAuthor }: { view: ResolvedNode; isAuthor: boolean }) {
  const { setFocusedNodeId } = useContainerFocus();
  const handleFocusView = useCallback(() => {
    if (!isAuthor) return;
    setFocusedNodeId(view.node.node_id);
  }, [isAuthor, setFocusedNodeId, view.node.node_id]);

  return (
    <header onMouseDown={handleFocusView}>
      <EditableViewTitle nodeId={view.node.node_id} config={view.config} isAuthor={isAuthor} />
      {view.config.description ? <p>{String(view.config.description)}</p> : null}
    </header>
  );
}
