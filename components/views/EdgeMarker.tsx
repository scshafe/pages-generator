"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { useContainerFocus } from "@/components/author/ContainerFocusProvider";
import { createChildNode, reparentNode } from "@/components/views/contentOps";
import type { NodeRecord } from "@/lib/content/types";

type ScopeType = "group" | "view";

export function EdgeMarker({
  scopeId,
  scopeType,
  position,
  beforeNodeId
}: {
  scopeId: number;
  scopeType: ScopeType;
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
      const textNode = await createChildNode(scopeId, "PlainTextUnit", { text: "" });
      if (position === "start" && beforeNodeId) {
        await reparentNode(textNode.node_id, scopeId, beforeNodeId, { skipIfMissing: true });
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
  }, [beforeNodeId, position, router, scopeId, setFocusedNodeId, setPendingInlineFocusId, toast]);

  const wrapClass =
    position === "start"
      ? "group-edge-marker-wrap group-edge-marker-wrap--start"
      : "group-edge-marker-wrap group-edge-marker-wrap--end";
  const componentType = scopeType === "view" ? "ViewMarker" : "GroupMarker";

  return (
    <button
      className={wrapClass}
      type="button"
      aria-label={position === "start" ? "Add text at start" : "Add text at end"}
      data-edge-marker={position}
      data-parent-id={scopeId}
      data-node-id={scopeId}
      data-component-type={componentType}
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
