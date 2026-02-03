"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import { useContainerFocus } from "@/blogcomponents/author/ContainerFocusProvider";
import { createChildNode, reparentNode } from "@/blogcomponents/views/contentOps";

type ScopeType = "group" | "view";
type EdgeMarkerPosition = "between" | "end";

export function EdgeMarker({
  scopeId,
  scopeType,
  position,
  beforeNodeId,
  isBlank = false
}: {
  scopeId: number;
  scopeType: ScopeType;
  position: EdgeMarkerPosition;
  beforeNodeId?: number | null;
  isBlank?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { setFocusedNodeId, setPendingInlineFocusId } = useContainerFocus();
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const markerRef = useRef<HTMLButtonElement | null>(null);

  const addText = useCallback(async (initialText = "") => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const textNode = await createChildNode(scopeId, "PlainTextUnit", { text: initialText });
      if (beforeNodeId) {
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
  }, [beforeNodeId, router, scopeId, setFocusedNodeId, setPendingInlineFocusId, toast]);

  const siblingSelector = useMemo(
    () =>
      `[data-parent-id='${scopeId}'][data-navigable='true'], [data-parent-id='${scopeId}'][data-edge-marker]`,
    [scopeId]
  );

  const focusImmediateEditable = useCallback(
    (direction: "prev" | "next") => {
      const marker = markerRef.current;
      if (!marker) return;
      const siblings = Array.from(document.querySelectorAll(siblingSelector)) as HTMLElement[];
      const index = siblings.indexOf(marker);
      if (index < 0) return;
      const targetIndex = direction === "prev" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= siblings.length) return;
      const target = siblings[targetIndex];
      if (target.dataset.edgeMarker) return;
      const editable = target.querySelector("[contenteditable='true']") as HTMLElement | null;
      if (!editable) return;
      const targetId = Number(target.dataset.nodeId ?? "");
      if (!targetId) return;
      setFocusedNodeId(targetId);
      setPendingInlineFocusId(targetId);
    },
    [setFocusedNodeId, setPendingInlineFocusId, siblingSelector]
  );

  const handleTyping = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addText("");
        return;
      }
      if (event.key.length !== 1) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      addText(event.key);
    },
    [addText]
  );

  const wrapClass =
    position === "end"
      ? "group-edge-marker-wrap group-edge-marker-wrap--end"
      : "group-edge-marker-wrap group-edge-marker-wrap--between";
  const componentType = scopeType === "view" ? "ViewMarker" : "GroupMarker";

  return (
    <div className={`${wrapClass}${isBlank ? " group-edge-marker-wrap--blank" : ""}`}>
      {isBlank ? null : (
        <button
          className="group-edge-marker-arrow group-edge-marker-arrow--prev"
          type="button"
          tabIndex={-1}
          aria-label="Focus previous text unit"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => focusImmediateEditable("prev")}
        >
          ^
        </button>
      )}
      <button
        ref={markerRef}
        className={`group-edge-marker${isBlank ? " group-edge-marker--blank" : ""}`}
        type="button"
        aria-label="Edge marker"
        data-edge-marker={position}
        data-parent-id={scopeId}
        data-node-id={scopeId}
        data-component-type={componentType}
        disabled={isSaving}
        onFocus={() => {
          setFocusedNodeId(scopeId);
        }}
        onClick={(event) => {
          event.stopPropagation();
          markerRef.current?.focus();
        }}
        onKeyDown={handleTyping}
      >
        {isBlank ? ">" : null}
      </button>
      {isBlank ? null : (
        <button
          className="group-edge-marker-arrow group-edge-marker-arrow--next"
          type="button"
          tabIndex={-1}
          aria-label="Focus next text unit"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => focusImmediateEditable("next")}
        >
          v
        </button>
      )}
    </div>
  );
}
