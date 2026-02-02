"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { useContainerFocus } from "@/components/author/ContainerFocusProvider";
import type { NodeRecord } from "@/lib/content/types";

export function GroupEndComposer({ groupNodeId }: { groupNodeId: number }) {
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
      const textNode = await apiFetch<NodeRecord>(`/nodes/${groupNodeId}/children`, {
        method: "POST",
        body: JSON.stringify({ component_type: "PlainTextUnit", config: { text: "" } })
      });
      setFocusedNodeId(textNode.node_id);
      setPendingInlineFocusId(textNode.node_id);
      router.refresh();
    } catch {
      toast.push("Failed to add text", "error");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [groupNodeId, router, setFocusedNodeId, setPendingInlineFocusId, toast]);

  return (
    <button
      className="group-edge-marker-wrap group-edge-marker-wrap--end"
      type="button"
      aria-label="Add text"
      data-edge-marker="end"
      data-parent-id={groupNodeId}
      data-node-id={groupNodeId}
      data-component-type="GroupMarker"
      disabled={isSaving}
      onClick={addText}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          addText();
        }
      }}
    >
      <span className="group-edge-marker" aria-hidden="true" />
    </button>
  );
}
