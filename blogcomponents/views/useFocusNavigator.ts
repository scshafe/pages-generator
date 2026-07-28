import { useCallback } from "react";

const inlineEditableTypes = new Set([
  "PlainTextUnit",
  "CodeUnit",
  "CodeBlockUnit",
  "LinkUnit",
  "ButtonUnit"
]);
const unitTypes = new Set([
  "PlainTextUnit",
  "CodeUnit",
  "CodeBlockUnit",
  "LinkUnit",
  "ButtonUnit",
  "DividerUnit",
  "SectionUnit",
  "AlertUnit",
  "MarkdownUnit"
]);
const scopeComponentTypes = new Set(["Group", "GroupMarker", "ViewMarker"]);

function getSelectionOffset(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer)) return null;
  const preRange = range.cloneRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true']"));
}

export function isCaretAtStart(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  if (!selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer)) return false;
  const offset = getSelectionOffset(container);
  return offset === 0;
}

export function isCaretAtEnd(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  if (!selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer)) return false;
  const offset = getSelectionOffset(container);
  if (offset === null) return false;
  const length = container.textContent?.length ?? 0;
  if (offset >= length) return true;
  if (range.startContainer === container) {
    const childCount = container.childNodes.length;
    return range.startOffset >= childCount;
  }
  return false;
}

export function useFocusNavigator({
  focusRef,
  setFocusedNodeId,
  setPendingInlineFocusId
}: {
  focusRef: React.MutableRefObject<number | null>;
  setFocusedNodeId: (id: number) => void;
  setPendingInlineFocusId: (id: number) => void;
}) {
  const focusElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;
      if (element.dataset.edgeMarker) {
        const parentId = Number(element.dataset.parentId ?? "");
        if (parentId) {
          setFocusedNodeId(parentId);
        }
        element.focus();
        return;
      }
      const nodeId = Number(element.dataset.nodeId ?? "");
      if (!nodeId) return;
      const type = element.dataset.componentType ?? "";
      setFocusedNodeId(nodeId);
      if (inlineEditableTypes.has(type)) {
        setPendingInlineFocusId(nodeId);
      }
      element.focus();
    },
    [setFocusedNodeId, setPendingInlineFocusId]
  );

  const getSiblingElements = useCallback((parentId: string) => {
    return Array.from(
      document.querySelectorAll(
        `[data-parent-id='${parentId}'][data-navigable='true'], [data-parent-id='${parentId}'][data-edge-marker]`
      )
    ) as HTMLElement[];
  }, []);

  const getFocusElement = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    const activeNode = active?.closest("[data-node-id], [data-edge-marker]") as HTMLElement | null;
    if (activeNode) return activeNode;
    const focusId = focusRef.current;
    if (!focusId) return null;
    return document.querySelector(`[data-node-id='${focusId}']`) as HTMLElement | null;
  }, [focusRef]);

  const getScopeIdForElement = useCallback((element: HTMLElement | null) => {
    if (!element) return null;
    const componentType = element.dataset.componentType ?? "";
    if (scopeComponentTypes.has(componentType) || element.dataset.edgeMarker) {
      const nodeId = Number(element.dataset.nodeId ?? "");
      return Number.isNaN(nodeId) || nodeId <= 0 ? null : nodeId;
    }
    const parentId = Number(element.dataset.parentId ?? "");
    return Number.isNaN(parentId) || parentId <= 0 ? null : parentId;
  }, []);

  const findNearestInScope = useCallback(
    (scopeId: number, fromElement: HTMLElement | null, predicate: (element: HTMLElement) => boolean) => {
      const siblings = getSiblingElements(String(scopeId));
      if (!siblings.length) return null;
      const candidates = siblings.filter(predicate);
      if (!candidates.length) return null;
      if (!fromElement) return candidates[0] ?? null;
      const fromIndex = siblings.indexOf(fromElement);
      if (fromIndex < 0) return candidates[0] ?? null;
      let best = candidates[0] ?? null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const candidate of candidates) {
        const candidateIndex = siblings.indexOf(candidate);
        if (candidateIndex < 0) continue;
        const distance = Math.abs(candidateIndex - fromIndex);
        if (distance < bestDistance) {
          best = candidate;
          bestDistance = distance;
        }
      }
      return best;
    },
    [getSiblingElements]
  );

  const focusFirst = useCallback(() => {
    const first = document.querySelector("[data-navigable='true']") as HTMLElement | null;
    focusElement(first);
  }, [focusElement]);

  const focusSibling = useCallback(
    (direction: "prev" | "next") => {
      const active = document.activeElement as HTMLElement | null;
      let current = active?.closest("[data-node-id], [data-edge-marker]") as HTMLElement | null;
      if (!current) {
        const currentId = focusRef.current;
        if (!currentId) {
          focusFirst();
          return;
        }
        current = document.querySelector(`[data-node-id='${currentId}']`) as HTMLElement | null;
      }
      if (!current) {
        focusFirst();
        return;
      }
      const parentId = current.dataset.parentId ?? "";
      if (!parentId) return;
      const siblings = getSiblingElements(parentId);
      const index = siblings.indexOf(current);
      const nextIndex = direction === "prev" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= siblings.length) {
        if (direction === "next") {
          const edgeMarker = document.querySelector(
            `[data-edge-marker='end'][data-parent-id='${parentId}']`
          ) as HTMLElement | null;
          focusElement(edgeMarker);
        }
        return;
      }
      focusElement(siblings[nextIndex] ?? null);
    },
    [focusElement, focusFirst, getSiblingElements, focusRef]
  );

  const focusAdjacent = useCallback(
    (direction: "prev" | "next") => {
      const active = document.activeElement as HTMLElement | null;
      let current = active?.closest("[data-node-id], [data-edge-marker]") as HTMLElement | null;
      if (!current) {
        const currentId = focusRef.current;
        if (!currentId) {
          focusFirst();
          return;
        }
        current = document.querySelector(`[data-node-id='${currentId}']`) as HTMLElement | null;
      }
      if (!current) return;
      const parentId = current.dataset.parentId ?? "";
      if (!parentId) return;
      const siblings = getSiblingElements(parentId);
      const index = siblings.indexOf(current);
      const nextIndex = direction === "prev" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= siblings.length) return;
      focusElement(siblings[nextIndex] ?? null);
    },
    [focusElement, focusFirst, getSiblingElements, focusRef]
  );

  const moveOut = useCallback(
    (direction: "prev" | "next") => {
      const currentId = focusRef.current;
      if (!currentId) return;
      const current = document.querySelector(`[data-node-id='${currentId}']`) as HTMLElement | null;
      if (!current) return;
      const parentId = current.dataset.parentId ?? "";
      if (!parentId) return;
      const parent = document.querySelector(`[data-node-id='${parentId}']`) as HTMLElement | null;
      if (!parent) return;
      const grandParentId = parent.dataset.parentId ?? "";
      if (!grandParentId) return;
      const siblings = getSiblingElements(grandParentId);
      const index = siblings.indexOf(parent);
      if (index < 0) return;
      const nextIndex = direction === "prev" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= siblings.length) return;
      focusElement(siblings[nextIndex] ?? null);
    },
    [focusElement, focusRef, getSiblingElements]
  );

  const moveIn = useCallback(
    (direction: "prev" | "next") => {
      const currentId = focusRef.current;
      if (!currentId) return;
      const current = document.querySelector(`[data-node-id='${currentId}']`) as HTMLElement | null;
      if (!current) return;
      const currentType = current.dataset.componentType ?? "";
      const baseGroupId = currentType === "Group" ? currentId : Number(current.dataset.parentId ?? "");
      if (!baseGroupId) return;
      const childGroups = Array.from(
        document.querySelectorAll(
          `[data-parent-id='${baseGroupId}'][data-component-type='Group'][data-navigable='true']`
        )
      ) as HTMLElement[];
      if (!childGroups.length) return;
      const currentChild = childGroups.find(
        (item) => Number(item.dataset.nodeId ?? "") === currentId
      );
      const currentIndex = currentChild ? childGroups.indexOf(currentChild) : -1;
      const nextIndex =
        currentIndex >= 0
          ? direction === "prev"
            ? currentIndex - 1
            : currentIndex + 1
          : direction === "prev"
            ? childGroups.length - 1
            : 0;
      if (nextIndex < 0 || nextIndex >= childGroups.length) return;
      focusElement(childGroups[nextIndex] ?? null);
    },
    [focusElement, focusRef]
  );

  const moveCaret = useCallback(
    (position: "start" | "end") => {
      const activeElement = getFocusElement();
      const activeType = activeElement?.dataset.componentType ?? "";
      let targetElement = activeElement && inlineEditableTypes.has(activeType) ? activeElement : null;
      if (!targetElement) {
        const scopeId = getScopeIdForElement(activeElement);
        if (!scopeId) return;
        targetElement = findNearestInScope(
          scopeId,
          activeElement,
          (element) => inlineEditableTypes.has(element.dataset.componentType ?? "")
        );
      }
      if (!targetElement) return;
      const targetId = Number(targetElement.dataset.nodeId ?? "");
      if (!targetId) return;
      const editable = targetElement.querySelector("[contenteditable='true']") as HTMLElement | null;
      if (!editable) return;
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(position === "start");
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editable.focus();
      setFocusedNodeId(targetId);
      setPendingInlineFocusId(targetId);
    },
    [findNearestInScope, getFocusElement, getScopeIdForElement, setFocusedNodeId, setPendingInlineFocusId]
  );

  const resolveTargetTextUnit = useCallback(() => {
    const activeElement = getFocusElement();
    if (!activeElement) return null;
    const componentType = activeElement.dataset.componentType ?? "";
    if (inlineEditableTypes.has(componentType)) {
      const targetId = Number(activeElement.dataset.nodeId ?? "");
      return targetId ? { nodeId: targetId } : null;
    }
    const scopeId = getScopeIdForElement(activeElement);
    if (!scopeId) return null;
    const targetElement = findNearestInScope(
      scopeId,
      activeElement,
      (element) => inlineEditableTypes.has(element.dataset.componentType ?? "")
    );
    const resolvedId = targetElement ? Number(targetElement.dataset.nodeId ?? "") : null;
    if (!resolvedId) return null;
    return { nodeId: resolvedId };
  }, [findNearestInScope, getFocusElement, getScopeIdForElement]);

  const resolveTargetUnit = useCallback(() => {
    const activeElement = getFocusElement();
    if (!activeElement) return null;
    const componentType = activeElement.dataset.componentType ?? "";
    if (unitTypes.has(componentType)) {
      const targetId = Number(activeElement.dataset.nodeId ?? "");
      return targetId ? { nodeId: targetId, componentType } : null;
    }
    const scopeId = getScopeIdForElement(activeElement);
    if (!scopeId) return null;
    const targetElement = findNearestInScope(
      scopeId,
      activeElement,
      (element) => unitTypes.has(element.dataset.componentType ?? "")
    );
    const resolvedId = targetElement ? Number(targetElement.dataset.nodeId ?? "") : null;
    const resolvedType = targetElement?.dataset.componentType ?? "";
    if (!resolvedId || !resolvedType) return null;
    return { nodeId: resolvedId, componentType: resolvedType };
  }, [findNearestInScope, getFocusElement, getScopeIdForElement]);

  return {
    focusElement,
    focusFirst,
    focusSibling,
    focusAdjacent,
    moveOut,
    moveIn,
    moveCaret,
    resolveTargetTextUnit,
    resolveTargetUnit
  };
}
