"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import { useContainerFocus } from "@/blogcomponents/author/ContainerFocusProvider";
import { createChildNode, reparentNode } from "@/blogcomponents/views/contentOps";
import type { NodeRecord } from "@/lib/content/types";

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

  const addText = useCallback(async (initialText = ""): Promise<NodeRecord | null> => {
    if (savingRef.current) return null;
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
      return textNode;
    } catch {
      toast.push("Failed to add text", "error");
      return null;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [beforeNodeId, router, scopeId, setFocusedNodeId, setPendingInlineFocusId, toast]);

  const addGroup = useCallback(async (): Promise<NodeRecord | null> => {
    if (savingRef.current) return null;
    savingRef.current = true;
    setIsSaving(true);
    try {
      const groupNode = await createChildNode(scopeId, "Group", { child_node_id: null });
      if (beforeNodeId) {
        await reparentNode(groupNode.node_id, scopeId, beforeNodeId, { skipIfMissing: true });
      }
      const textNode = await createChildNode(groupNode.node_id, "PlainTextUnit", { text: "" });
      if (textNode) {
        setFocusedNodeId(textNode.node_id);
        setPendingInlineFocusId(textNode.node_id);
      } else {
        setFocusedNodeId(groupNode.node_id);
      }
      router.refresh();
      return groupNode;
    } catch {
      toast.push("Failed to add group", "error");
      return null;
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

  const focusAdjacentEditable = useCallback(
    (direction: "prev" | "next", caretPosition: "start" | "end") => {
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
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(caretPosition === "start");
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editable.focus();
      setFocusedNodeId(targetId);
    },
    [setFocusedNodeId, siblingSelector]
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

  const openMenuForNode = useCallback((nodeId: number, menuType: string) => {
    let attempts = 0;
    const maxAttempts = 12;
    const attempt = () => {
      const target = document.querySelector(`[data-node-id='${nodeId}']`) as HTMLElement | null;
      if (target) {
        window.dispatchEvent(
          new CustomEvent("author-menu-open", {
            detail: { nodeId, menuType }
          })
        );
        return;
      }
      attempts += 1;
      if (attempts < maxAttempts) {
        window.requestAnimationFrame(attempt);
      }
    };
    window.requestAnimationFrame(attempt);
  }, []);

  useEffect(() => {
    const handleMenuOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ edgeMarker?: boolean; menuType?: string }>).detail;
      if (!detail?.edgeMarker) return;
      if (detail.menuType !== "unit") return;
      if (document.activeElement !== markerRef.current) return;
      (async () => {
        const created = await addText("");
        if (!created) return;
        openMenuForNode(created.node_id, detail.menuType ?? "unit");
      })();
    };
    window.addEventListener("author-menu-open", handleMenuOpen as EventListener);
    return () => window.removeEventListener("author-menu-open", handleMenuOpen as EventListener);
  }, [addText, openMenuForNode]);

  useEffect(() => {
    const handleGroupCreate = (event: Event) => {
      const detail = (event as CustomEvent<{ edgeMarker?: boolean }>).detail;
      if (!detail?.edgeMarker) return;
      if (document.activeElement !== markerRef.current) return;
      (async () => {
        await addGroup();
      })();
    };
    window.addEventListener("author-group-create", handleGroupCreate as EventListener);
    return () => window.removeEventListener("author-group-create", handleGroupCreate as EventListener);
  }, [addGroup]);

  return (
    <div className={`${wrapClass}${isBlank ? " group-edge-marker-wrap--blank" : ""}`}>
      {isBlank ? null : (
        <button
          className="group-edge-marker-edge group-edge-marker-segment"
          type="button"
          tabIndex={-1}
          aria-label="Focus previous text unit"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => focusAdjacentEditable("prev", "end")}
        />
      )}
      <button
        ref={markerRef}
        className={`group-edge-marker group-edge-marker-segment${isBlank ? " group-edge-marker--blank" : ""}`}
        type="button"
        aria-label="Edge marker"
        data-edge-marker={position}
        data-parent-id={scopeId}
        data-node-id={scopeId}
        data-before-node-id={beforeNodeId ?? ""}
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
          className="group-edge-marker-edge group-edge-marker-segment"
          type="button"
          tabIndex={-1}
          aria-label="Focus next text unit"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => focusAdjacentEditable("next", "start")}
        />
      )}
    </div>
  );
}
