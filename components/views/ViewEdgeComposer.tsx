"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { useContainerFocus } from "@/components/author/ContainerFocusProvider";
import type { NodeRecord } from "@/lib/content/types";

export function ViewEdgeComposer({
  viewNodeId,
  position,
  beforeNodeId
}: {
  viewNodeId: number;
  position: "start" | "end";
  beforeNodeId?: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const { setFocusedNodeId, setPendingInlineFocusId } = useContainerFocus();
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const addText = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const textNode = await apiFetch<NodeRecord>(`/nodes/${viewNodeId}/children`, {
        method: "POST",
        body: JSON.stringify({ component_type: "PlainTextUnit", config: { text: "" } })
      });
      if (position === "start" && beforeNodeId) {
        await apiFetch(`/nodes/${textNode.node_id}/reparent`, {
          method: "PUT",
          body: JSON.stringify({ target_parent_node_id: viewNodeId, before_node_id: beforeNodeId })
        });
      }
      setFocusedNodeId(textNode.node_id);
      setPendingInlineFocusId(textNode.node_id);
      router.refresh();
    } catch {
      toast.push("Failed to add text", "error");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [beforeNodeId, position, router, setFocusedNodeId, setPendingInlineFocusId, toast, viewNodeId]);

  const wrapClass =
    position === "start"
      ? "group-edge-marker-wrap group-edge-marker-wrap--start"
      : "group-edge-marker-wrap group-edge-marker-wrap--end";

  return (
    <button
      className={wrapClass}
      type="button"
      aria-label={position === "start" ? "Add text at start of view" : "Add text at end of view"}
      data-edge-marker={position}
      data-parent-id={viewNodeId}
      data-node-id={viewNodeId}
      data-component-type="ViewMarker"
      disabled={isSaving}
      onClick={addText}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          addText();
        }
      }}
    >
      <span className={`group-edge-marker group-edge-marker--${position}`} aria-hidden="true" />
    </button>
  );
}
