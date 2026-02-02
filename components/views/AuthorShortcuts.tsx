"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContainerFocus } from "@/components/author/ContainerFocusProvider";
import { useToast } from "@/components/ui/ToastProvider";

type MenuTrigger = "container" | "unit" | "style";

const inlineEditableTypes = new Set(["PlainTextUnit", "CodeUnit", "CodeBlockUnit", "LinkUnit"]);
const navigableSelector = "[data-navigable='true']";

function isHyper(event: KeyboardEvent) {
  return event.metaKey && event.ctrlKey && event.altKey && event.shiftKey;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, button, a, [contenteditable='true']"));
}

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

function isCaretAtStart(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  if (!selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer)) return false;
  const offset = getSelectionOffset(container);
  return offset === 0;
}

function isCaretAtEnd(container: HTMLElement) {
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

export function AuthorShortcuts() {
  const { focusedNodeId, setFocusedNodeId, setPendingInlineFocusId } = useContainerFocus();
  const toast = useToast();
  const focusRef = useRef<number | null>(focusedNodeId ?? null);
  const chordRef = useRef<{ mode: "out" | "in" | null; timer: number | null }>({
    mode: null,
    timer: null
  });

  useEffect(() => {
    focusRef.current = focusedNodeId ?? null;
  }, [focusedNodeId]);

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

  const resolveTargetTextUnit = useCallback(() => {
    const focusId = focusRef.current;
    const activeElement = document.activeElement as HTMLElement | null;
    const activeNode = activeElement?.closest("[data-node-id]") as HTMLElement | null;
    const targetId = focusId ?? (activeNode ? Number(activeNode.dataset.nodeId ?? "") : null);
    if (!targetId) return null;

    let targetElement = document.querySelector(`[data-node-id='${targetId}']`) as HTMLElement | null;
    if (targetElement && targetElement.dataset.componentType !== "PlainTextUnit") {
      const textChild = targetElement.querySelector("[data-component-type='PlainTextUnit']") as HTMLElement | null;
      if (textChild) {
        targetElement = textChild;
      }
    }

    const resolvedId = targetElement ? Number(targetElement.dataset.nodeId ?? "") : null;
    if (!resolvedId || targetElement?.dataset.componentType !== "PlainTextUnit") {
      return null;
    }
    return { nodeId: resolvedId };
  }, []);

  const openMenu = useCallback(
    (menuType: MenuTrigger) => {
      const target = resolveTargetTextUnit();
      if (!target) {
        toast.push("Focus a text unit to open menus", "error");
        return;
      }

      window.dispatchEvent(
        new CustomEvent("author-menu-open", {
          detail: { nodeId: target.nodeId, menuType }
        })
      );
    },
    [resolveTargetTextUnit, toast]
  );

  const createGroup = useCallback(() => {
    const target = resolveTargetTextUnit();
    if (!target) {
      toast.push("Focus a text unit to create a group", "error");
      return;
    }
    window.dispatchEvent(
      new CustomEvent("author-group-create", {
        detail: { nodeId: target.nodeId }
      })
    );
  }, [resolveTargetTextUnit, toast]);

  const focusFirst = useCallback(() => {
    const first = document.querySelector(navigableSelector) as HTMLElement | null;
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
    [focusElement, focusFirst, getSiblingElements]
  );

  const moveCaret = useCallback(
    (position: "start" | "end") => {
      const currentId = focusRef.current;
      if (!currentId) return;
      const current = document.querySelector(`[data-node-id='${currentId}']`) as HTMLElement | null;
      if (!current) return;
      const editable = current.querySelector("[contenteditable='true']") as HTMLElement | null;
      if (!editable) return;
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(position === "start");
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editable.focus();
      setFocusedNodeId(currentId);
      setPendingInlineFocusId(currentId);
    },
    [setFocusedNodeId, setPendingInlineFocusId]
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
    [focusElement, focusFirst, getSiblingElements]
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
    [focusElement, getSiblingElements]
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
    [focusElement]
  );

  const startChord = useCallback((mode: "out" | "in") => {
    if (chordRef.current.timer) {
      window.clearTimeout(chordRef.current.timer);
    }
    chordRef.current.mode = mode;
    chordRef.current.timer = window.setTimeout(() => {
      chordRef.current.mode = null;
      chordRef.current.timer = null;
    }, 1500);
  }, []);

  const clearChord = useCallback(() => {
    if (chordRef.current.timer) {
      window.clearTimeout(chordRef.current.timer);
    }
    chordRef.current.mode = null;
    chordRef.current.timer = null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (chordRef.current.mode && (key === "j" || key === "k")) {
        event.preventDefault();
        const direction = key === "j" ? "prev" : "next";
        if (chordRef.current.mode === "out") {
          moveOut(direction);
        } else {
          moveIn(direction);
        }
        clearChord();
        return;
      }

      if (isHyper(event)) {
        if (key === "g") {
          event.preventDefault();
          createGroup();
          return;
        }
        if (key === "u") {
          event.preventDefault();
          openMenu("unit");
          return;
        }
        if (key === "p") {
          event.preventDefault();
          openMenu("unit");
          return;
        }
        if (key === "l") {
          event.preventDefault();
          openMenu("style");
          return;
        }
        if (key === "]") {
          event.preventDefault();
          moveCaret("end");
          return;
        }
        if (key === "[") {
          event.preventDefault();
          moveCaret("start");
          return;
        }
        if (key === "k") {
          event.preventDefault();
          focusSibling("next");
          return;
        }
        if (key === "j") {
          event.preventDefault();
          focusSibling("prev");
          return;
        }
        if (key === "o") {
          event.preventDefault();
          startChord("out");
          return;
        }
        if (key === "i") {
          event.preventDefault();
          startChord("in");
          return;
        }
      }

      if (key === "arrowright" || key === "arrowleft") {
        const editable = (event.target as HTMLElement | null)?.closest("[contenteditable='true']") as HTMLElement | null;
        if (editable) {
          if (key === "arrowright" && !isCaretAtEnd(editable)) return;
          if (key === "arrowleft" && !isCaretAtStart(editable)) return;
        } else if (isEditableTarget(event.target)) {
          return;
        }
        event.preventDefault();
        focusAdjacent(key === "arrowleft" ? "prev" : "next");
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearChord, createGroup, focusAdjacent, focusSibling, moveCaret, moveIn, moveOut, openMenu, startChord]);

  return null;
}
