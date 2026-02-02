"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContainerFocus } from "@/components/author/ContainerFocusProvider";
import { useToast } from "@/components/ui/ToastProvider";
import {
  isCaretAtEnd,
  isCaretAtStart,
  isEditableTarget,
  useFocusNavigator
} from "@/components/views/useFocusNavigator";

type MenuTrigger = "container" | "unit" | "style";

function isHyper(event: KeyboardEvent) {
  return event.metaKey && event.ctrlKey && event.altKey && event.shiftKey;
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

  const {
    resolveTargetTextUnit,
    focusSibling,
    focusAdjacent,
    moveOut,
    moveIn,
    moveCaret
  } = useFocusNavigator({
    focusRef,
    setFocusedNodeId,
    setPendingInlineFocusId
  });

  const openMenu = useCallback(
    (menuType: MenuTrigger) => {
      const target = resolveTargetTextUnit();
      if (!target) {
        toast.push("No text unit available to open menu", "error");
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
      toast.push("No text unit available to create a group", "error");
      return;
    }
    window.dispatchEvent(
      new CustomEvent("author-group-create", {
        detail: { nodeId: target.nodeId }
      })
    );
  }, [resolveTargetTextUnit, toast]);

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
          const navigableTarget = (event.target as HTMLElement | null)?.closest(
            "[data-navigable='true'], [data-edge-marker]"
          );
          if (!navigableTarget) {
            return;
          }
        }
        event.preventDefault();
        focusAdjacent(key === "arrowleft" ? "prev" : "next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearChord, createGroup, focusAdjacent, focusSibling, moveCaret, moveIn, moveOut, openMenu, startChord]);

  return null;
}
