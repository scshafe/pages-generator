"use client";

import type { NodeRecord, ResolvedNode } from "@/lib/content/types";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { useContainerFocus } from "@/components/author/ContainerFocusProvider";
import { useDragScope } from "@/components/views/DragScopeProvider";
import { isScopeComponent, resolveGroupKind } from "@/lib/content/containers";
import { GroupEndComposer } from "@/components/views/GroupEndComposer";

type MenuType = "container" | "unit" | "style" | null;

type MenuOption = {
  id: string;
  label: string;
  componentType: string;
  placement?: "sub";
  buildConfig: (text: string) => Record<string, unknown>;
};

const inlineEditableTypes = new Set(["PlainTextUnit", "CodeUnit", "CodeBlockUnit", "LinkUnit"]);

const containerOptions: MenuOption[] = [
  {
    id: "sub-group",
    label: "Sub Group",
    componentType: "Group",
    placement: "sub",
    buildConfig: () => ({
      group_kind: "inline",
      child_node_id: null
    })
  }
];

const unitOptions: MenuOption[] = [
  {
    id: "text",
    label: "Text",
    componentType: "PlainTextUnit",
    buildConfig: (text) => ({ text })
  },
  {
    id: "code",
    label: "Code",
    componentType: "CodeUnit",
    buildConfig: (text) => ({ code: text })
  },
  {
    id: "codeblock",
    label: "Code Block",
    componentType: "CodeBlockUnit",
    buildConfig: (text) => ({ code: text })
  },
  {
    id: "link",
    label: "Link",
    componentType: "LinkUnit",
    buildConfig: (text) => ({ label: text || "Link", url: deriveUrl(text) })
  },
  {
    id: "button",
    label: "Button",
    componentType: "ButtonUnit",
    buildConfig: (text) => ({ label: text || "Button", url: deriveUrl(text) })
  },
  {
    id: "image",
    label: "Image",
    componentType: "ImageMedia",
    buildConfig: (text) => ({ src: text, alt: "" })
  },
  {
    id: "video",
    label: "Video",
    componentType: "VideoMedia",
    buildConfig: (text) => ({ src: text, autoplay: false })
  },
  {
    id: "dividor",
    label: "Dividor",
    componentType: "DividorUnit",
    buildConfig: () => ({})
  }
];

function deriveUrl(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "/";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return "/";
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

function setCaretPosition(container: HTMLElement, index: number) {
  const selection = window.getSelection();
  if (!selection) return;
  let remaining = index;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let targetNode: Text | null = null;
  let targetOffset = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      targetNode = node;
      targetOffset = remaining;
      break;
    }
    remaining -= length;
  }
  if (!targetNode) {
    const textNode = document.createTextNode(container.textContent ?? "");
    container.textContent = "";
    container.appendChild(textNode);
    targetNode = textNode;
    targetOffset = Math.min(index, textNode.textContent?.length ?? 0);
  }
  const range = document.createRange();
  range.setStart(targetNode, targetOffset);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  container.focus();
}

function getCaretRangeFromPoint(x: number, y: number) {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (doc.caretRangeFromPoint) {
    return doc.caretRangeFromPoint(x, y);
  }
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    if (!position) return null;
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }
  return null;
}

function containsNodeId(node: ResolvedNode, targetId: number): boolean {
  if (node.node.node_id === targetId) return true;
  return node.children.some((child) => containsNodeId(child, targetId));
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
    if (range.startOffset >= childCount) return true;
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let lastText: Text | null = null;
  while (walker.nextNode()) {
    lastText = walker.currentNode as Text;
  }
  if (lastText) {
    return range.startContainer === lastText && range.startOffset >= (lastText.textContent?.length ?? 0);
  }
  return offset === 0 && length === 0;
}
function ArrowInIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M7 4l6 6-6 6v-4H3v-4h4V4z" />
    </svg>
  );
}

function ArrowOutIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M13 4v4h4v4h-4v4l-6-6 6-6z" />
    </svg>
  );
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, input, textarea, select, a, [contenteditable='true']"));
}

function ScopeArrow({
  direction,
  targetScopeId,
  active
}: {
  direction: "down" | "up";
  targetScopeId: number;
  active: boolean;
}) {
  const dragScope = useDragScope();
  const [glowing, setGlowing] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const endHover = useCallback(() => {
    setGlowing(false);
    clearTimer();
  }, [clearTimer]);

  const startHover = useCallback(() => {
    if (!active) return;
    setGlowing(true);
    if (timerRef.current) return;
    timerRef.current = window.setTimeout(() => {
      dragScope?.setActiveScopeId(targetScopeId);
      setGlowing(false);
      timerRef.current = null;
    }, 2000);
  }, [active, dragScope, targetScopeId]);

  useEffect(() => {
    if (!active) {
      endHover();
    }
    return () => clearTimer();
  }, [active, endHover, clearTimer]);

  return (
    <div
      className={`scope-arrow scope-arrow-${direction}${glowing ? " glow" : ""}`}
      onDragEnter={(event) => {
        if (!active) return;
        event.preventDefault();
        startHover();
      }}
      onDragOver={(event) => {
        if (!active) return;
        event.preventDefault();
      }}
      onDragLeave={endHover}
      onDrop={(event) => {
        event.preventDefault();
      }}
      aria-hidden
    >
      {direction === "down" ? <ArrowInIcon /> : <ArrowOutIcon />}
    </div>
  );
}

export function SortableChildren({
  nodes,
  enabled,
  containerNodeId,
  containerType,
  containerConfig,
  isCompatible
}: {
  nodes: ResolvedNode[];
  enabled: boolean;
  containerNodeId: number;
  containerType: string;
  containerConfig: Record<string, unknown>;
  isCompatible: (draggedType: string, targetType: string, config: Record<string, unknown>) => boolean;
}) {
  const [items, setItems] = useState(nodes);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("before");
  const router = useRouter();
  const toast = useToast();
  const dragScope = useDragScope();
  const draggingId = dragScope?.draggingId ?? null;
  const draggingType = dragScope?.draggingType ?? "";
  const isDragging = enabled && Boolean(dragScope?.isDragging);
  const isActiveScope = isDragging && dragScope?.activeScopeId === containerNodeId;

  useEffect(() => {
    setItems(nodes);
  }, [nodes]);

  useEffect(() => {
    if (!isDragging || !isActiveScope) {
      setDropTargetId(null);
    }
  }, [isDragging, isActiveScope]);

  async function applyReorder(nodeId: number, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const direction = fromIndex < toIndex ? "down" : "up";
    const steps = Math.abs(fromIndex - toIndex);
    try {
      for (let i = 0; i < steps; i += 1) {
        await apiFetch(`/nodes/${nodeId}/move`, {
          method: "PUT",
          body: JSON.stringify({ direction })
        });
      }
      toast.push("Order updated", "success");
      router.refresh();
    } catch {
      toast.push("Reorder failed", "error");
      router.refresh();
    }
  }

  function parseDragData(event: React.DragEvent<HTMLDivElement>) {
    try {
      const raw = event.dataTransfer.getData("application/json");
      if (!raw) return null;
      return JSON.parse(raw) as { nodeId: number; componentType: string };
    } catch {
      return null;
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>, targetId: number) {
    event.preventDefault();
    event.stopPropagation();
    if (!isActiveScope) return;
    const dragData = parseDragData(event);
    const draggedId = dragData?.nodeId ?? draggingId;
    const draggedType = dragData?.componentType ?? draggingType;
    if (!draggedId) return;
    if (!isCompatible(draggedType, containerType, containerConfig)) {
      toast.push("Incompatible item for this list", "error");
      return;
    }
    if (draggedId === targetId) return;
    const fromIndex = items.findIndex((item) => item.node.node_id === draggedId);
    const targetIndex = items.findIndex((item) => item.node.node_id === targetId);
    const toIndex = dropPosition === "after"
      ? Math.min(targetIndex + 1, Math.max(items.length - 1, 0))
      : targetIndex;
    if (toIndex < 0) return;
    if (fromIndex < 0) {
      try {
        const targetNextId = items[targetIndex]?.node.next_node_id ?? null;
        const payload: { target_parent_node_id: number; before_node_id?: number | null } = {
          target_parent_node_id: containerNodeId
        };
        if (dropPosition === "before") {
          payload.before_node_id = targetId;
        } else if (targetNextId) {
          payload.before_node_id = targetNextId;
        }
        await apiFetch(`/nodes/${draggedId}/reparent`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.push("Moved into container", "success");
        router.refresh();
      } catch {
        toast.push("Move failed", "error");
      }
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setItems(reordered);
    applyReorder(draggedId, fromIndex, toIndex);
    setDropTargetId(null);
    setDropPosition("before");
  }

  return (
    <div className="sortable-list">
      {items.map((child, index) => {
        const isContainer = isScopeComponent(child.component.type);
        const isGroupScope = child.component.type === "Group";
        const showDownArrow = isActiveScope && isContainer;
        const showDownOutline = isActiveScope && isContainer && isDragging;
        const isDividor = child.component.type === "DividorUnit";
        return (
        <div
          key={child.node.node_id}
          className={`draggable-item${isDividor ? " draggable-item--break" : ""}${isContainer ? " draggable-item--scope" : ""}${isGroupScope ? " draggable-item--group" : ""}${draggingId === child.node.node_id ? " dragging" : ""}${dropTargetId === child.node.node_id ? " drag-over" : ""}${dropTargetId === child.node.node_id && dropPosition === "after" ? " drag-over-after" : ""}${showDownOutline ? " scope-down" : ""}`}
          draggable={enabled}
          onDragStart={(event) => {
            if (!enabled) return;
            event.stopPropagation();
            if (isInteractiveTarget(event.target)) {
              event.preventDefault();
              return;
            }
            dragScope?.startDrag(child.node.node_id, child.component.type, containerNodeId);
            event.dataTransfer.setData(
              "application/json",
              JSON.stringify({ nodeId: child.node.node_id, componentType: child.component.type })
            );
            event.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => {
            dragScope?.endDrag();
            setDropTargetId(null);
            setDropPosition("before");
          }}
          onDragOver={(event) => {
            if (!enabled || !isActiveScope) return;
            event.preventDefault();
            setDropTargetId(child.node.node_id);
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const nextPosition = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
            setDropPosition(nextPosition);
          }}
          onDrop={(event) => handleDrop(event, child.node.node_id)}
        >
          {showDownArrow ? (
            <ScopeArrow direction="down" targetScopeId={child.node.node_id} active={isDragging} />
          ) : null}
          <ViewComponentRenderer
            node={child}
            parentType={containerType}
            previousSiblingType={items[index - 1]?.component.type ?? null}
            nextSiblingType={items[index + 1]?.component.type ?? null}
          />
        </div>
        );
      })}
    </div>
  );
}

export function ViewComponentRenderer({
  node,
  parentType,
  previousSiblingType,
  nextSiblingType
}: {
  node: ResolvedNode;
  parentType?: string;
  previousSiblingType?: string | null;
  nextSiblingType?: string | null;
}) {
  const { component, config } = node;
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const toast = useToast();
  const router = useRouter();
  const [containerDropActive, setContainerDropActive] = useState(false);
  const dragScope = useDragScope();
  const isDragging = Boolean(dragScope?.isDragging);
  const activeScopeId = dragScope?.activeScopeId ?? null;
  const {
    focusedNodeId,
    setActiveContainerId,
    setFocusedNodeId,
    pendingInlineFocusId,
    setPendingInlineFocusId
  } = useContainerFocus();
  const isTextUnit = component.type === "PlainTextUnit";
  const isCodeUnit = component.type === "CodeUnit";
  const isCodeBlockUnit = component.type === "CodeBlockUnit";
  const isLinkUnit = component.type === "LinkUnit";
  const isInlineEditable = isTextUnit || isCodeUnit || isCodeBlockUnit || isLinkUnit;
  const textValue = String((config as { text?: string }).text ?? "");
  const codeValue = isCodeUnit || isCodeBlockUnit ? String((config as { code?: string }).code ?? "") : "";
  const linkLabel = isLinkUnit ? String((config as { label?: string }).label ?? "") : "";
  const inlineInitialValue = isTextUnit
    ? textValue
    : isCodeUnit || isCodeBlockUnit
      ? codeValue
      : isLinkUnit
        ? linkLabel
        : "";
  const unitAnchorId = `unit-${node.node.node_id}`;
  const inlineValueRef = useRef(inlineInitialValue);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineSaving, setInlineSaving] = useState(false);
  const inlineEditableRef = useRef<HTMLElement | null>(null);
  const isInsertingRef = useRef(false);
  const [menuType, setMenuType] = useState<MenuType>(null);
  const [menuSplit, setMenuSplit] = useState<{ before: string; after: string } | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuCaretIndex, setMenuCaretIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuOptions = useMemo<MenuOption[]>(() => {
    if (menuType === "container") return containerOptions;
    if (menuType === "unit") return unitOptions;
    if (menuType === "style") return [];
    return [];
  }, [menuType]);
  const filteredMenuOptions = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    if (!query) return menuOptions;
    return menuOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [menuOptions, menuQuery]);

  useEffect(() => {
    if (!menuType) return;
    setMenuQuery("");
    setMenuIndex(0);
  }, [menuType]);

  useEffect(() => {
    if (!menuType) return;
    requestAnimationFrame(() => {
      if (!filteredMenuOptions.length) {
        menuRef.current?.focus();
        return;
      }
      const target = menuItemRefs.current[menuIndex] ?? menuItemRefs.current[0];
      target?.focus();
    });
  }, [filteredMenuOptions.length, menuIndex, menuType]);

  useEffect(() => {
    if (!isAuthor || !isTextUnit) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: number; menuType: MenuType }>).detail;
      if (!detail) return;
      if (detail.nodeId !== node.node.node_id) return;
      const editable = inlineEditableRef.current;
      const fullText = editable?.textContent ?? textValue;
      const caretIndex = editable ? getSelectionOffset(editable) ?? fullText.length : fullText.length;
      setMenuSplit({ before: fullText.slice(0, caretIndex), after: fullText.slice(caretIndex) });
      setMenuCaretIndex(caretIndex);
      setMenuType(detail.menuType);
    };
    window.addEventListener("author-menu-open", handler as EventListener);
    return () => window.removeEventListener("author-menu-open", handler as EventListener);
  }, [isAuthor, isTextUnit, node.node.node_id, textValue]);

  const selectMenuOption = useCallback(
    async (
      option: MenuOption,
      splitOverride?: { before: string; after: string },
      menuOverride?: MenuType
    ) => {
      if (inlineSaving) return;
      const split = splitOverride ?? menuSplit;
      if (!split) {
        setMenuType(null);
        setMenuSplit(null);
        setMenuQuery("");
        setMenuIndex(0);
        return;
      }
      const activeMenuType = menuOverride ?? menuType;
      const groupId = node.node.parent_node_id;
      if (!groupId) return;
      const beforeText = split.before;
      const afterText = split.after;
      const shouldRemoveCurrent = !beforeText.trim();
      const hasAfterText = Boolean(afterText.trim());

      setInlineSaving(true);
      try {
        const updates: Array<Promise<unknown>> = [];
        if (!shouldRemoveCurrent && beforeText !== textValue) {
          updates.push(
            apiFetch(`/components/${component.type}/${component.comp_id}`, {
              method: "PUT",
              body: JSON.stringify({
                config: {
                  ...(config as Record<string, unknown>),
                  text: beforeText
                }
              })
            })
          );
        }

        const createChild = async (parentId: number, componentType: string, configValue: Record<string, unknown>) => {
          return apiFetch<NodeRecord>(`/nodes/${parentId}/children`, {
            method: "POST",
            body: JSON.stringify({ component_type: componentType, config: configValue })
          });
        };

        const reparentNode = async (nodeId: number, parentId: number, beforeNodeId?: number | null) => {
          if (!beforeNodeId) return;
          await apiFetch(`/nodes/${nodeId}/reparent`, {
            method: "PUT",
            body: JSON.stringify({ target_parent_node_id: parentId, before_node_id: beforeNodeId })
          });
        };

        let createdNode: NodeRecord | null = null;
        let focusNodeId: number | null = null;
        let afterNodeId: number | null = null;
        let focusInlineNodeId: number | null = null;
        const shouldFocusInline =
          option.componentType === "PlainTextUnit" ||
          option.componentType === "CodeUnit" ||
          option.componentType === "CodeBlockUnit" ||
          option.componentType === "LinkUnit";

        if (activeMenuType === "unit") {
          const nextSiblingId = node.node.next_node_id;
          const configText = option.componentType === "PlainTextUnit" && hasAfterText ? afterText : "";
          createdNode = await createChild(groupId, option.componentType, option.buildConfig(configText));
          if (createdNode) {
            await reparentNode(createdNode.node_id, groupId, nextSiblingId);
          }

          if (createdNode && shouldFocusInline) {
            focusNodeId = createdNode.node_id;
          }

          if (hasAfterText && option.componentType !== "PlainTextUnit") {
            const afterNode = await createChild(groupId, "PlainTextUnit", { text: afterText });
            if (afterNode) {
              await reparentNode(afterNode.node_id, groupId, nextSiblingId);
              afterNodeId = afterNode.node_id;
              if (!shouldFocusInline) {
                focusNodeId = afterNode.node_id;
              }
            }
          }

          if (createdNode && !focusNodeId) {
            focusNodeId = createdNode.node_id;
          }
        }

        if (activeMenuType === "container") {
          createdNode = await createChild(groupId, option.componentType, option.buildConfig(""));
          if (createdNode) {
            const textNode = await createChild(createdNode.node_id, "PlainTextUnit", { text: "" });
            if (textNode) {
              focusNodeId = textNode.node_id;
              focusInlineNodeId = textNode.node_id;
            } else {
              focusNodeId = createdNode.node_id;
            }
          }

          if (hasAfterText) {
            const nextSiblingId = node.node.next_node_id;
            const afterNode = await createChild(groupId, "PlainTextUnit", { text: afterText });
            if (afterNode) {
              await reparentNode(afterNode.node_id, groupId, nextSiblingId);
              afterNodeId = afterNode.node_id;
            }
          }
        }

        await Promise.all(updates);

        if (shouldRemoveCurrent) {
          await apiFetch(`/nodes/${node.node.node_id}`, { method: "DELETE" });
        }

        if (focusNodeId) {
          setFocusedNodeId(focusNodeId);
          const focusInline =
            shouldFocusInline ||
            (afterNodeId !== null && focusNodeId === afterNodeId) ||
            focusInlineNodeId === focusNodeId;
          if (focusInline) {
            setPendingInlineFocusId(focusNodeId);
          }
        }

        setMenuType(null);
        setMenuSplit(null);
        setMenuQuery("");
        setMenuIndex(0);
        setMenuCaretIndex(null);
        router.refresh();
      } catch {
        toast.push("Failed to add component", "error");
      } finally {
        setInlineSaving(false);
      }
    },
    [
      component.comp_id,
      component.type,
      config,
      inlineSaving,
      menuSplit,
      menuType,
      node.node.next_node_id,
      node.node.node_id,
      node.node.parent_node_id,
      router,
      setFocusedNodeId,
      setPendingInlineFocusId,
      textValue,
      toast
    ]
  );

  useEffect(() => {
    if (!isAuthor || !isTextUnit) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: number }>).detail;
      if (!detail || detail.nodeId !== node.node.node_id) return;
      const option = containerOptions[0];
      if (!option) return;
      const editable = inlineEditableRef.current;
      const fullText = editable?.textContent ?? textValue;
      const caretIndex = editable ? getSelectionOffset(editable) ?? fullText.length : fullText.length;
      const split = { before: fullText.slice(0, caretIndex), after: fullText.slice(caretIndex) };
      setMenuSplit(split);
      setMenuCaretIndex(caretIndex);
      selectMenuOption(option, split, "container");
    };
    window.addEventListener("author-group-create", handler as EventListener);
    return () => window.removeEventListener("author-group-create", handler as EventListener);
  }, [isAuthor, isTextUnit, node.node.node_id, selectMenuOption, textValue]);

  useEffect(() => {
    if (filteredMenuOptions.length === 0) {
      if (menuIndex !== -1) {
        setMenuIndex(-1);
      }
      return;
    }
    if (menuIndex < 0 || menuIndex >= filteredMenuOptions.length) {
      setMenuIndex(0);
    }
  }, [filteredMenuOptions.length, menuIndex]);

  useEffect(() => {
    if (!isInlineEditable) return;
    if (isEditingInline) return;
    inlineValueRef.current = inlineInitialValue;
  }, [inlineInitialValue, isEditingInline, isInlineEditable]);

  useEffect(() => {
    if (!isInlineEditable) return;
    if (pendingInlineFocusId !== node.node.node_id) return;
    const target = inlineEditableRef.current;
    if (!target) return;
    target.focus();
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    setPendingInlineFocusId(null);
  }, [isInlineEditable, node.node.node_id, pendingInlineFocusId, setPendingInlineFocusId]);

  const handleComponentFocus = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!isAuthor) return;
      if (isInteractiveTarget(event.target)) return;
      event.stopPropagation();
      setFocusedNodeId(node.node.node_id);
    },
    [isAuthor, node.node.node_id, setFocusedNodeId]
  );

  const saveInlineText = useCallback(
    async (nextValue: string) => {
      if (inlineSaving) return;
      const trimmed = nextValue.trim();
      if (!trimmed) return;
      if (nextValue === textValue) return;
      setInlineSaving(true);
      try {
        await apiFetch(`/components/${component.type}/${component.comp_id}`, {
          method: "PUT",
          body: JSON.stringify({
            config: {
              ...(config as Record<string, unknown>),
              text: nextValue
            }
          })
        });
        router.refresh();
      } catch {
        toast.push("Failed to save text", "error");
      } finally {
        setInlineSaving(false);
      }
    },
    [component.comp_id, component.type, config, inlineSaving, router, textValue, toast]
  );

  const saveInlineField = useCallback(
    async (field: "code" | "label", nextValue: string, currentValue: string) => {
      if (inlineSaving) return;
      if (nextValue === currentValue) return;
      setInlineSaving(true);
      try {
        await apiFetch(`/components/${component.type}/${component.comp_id}`, {
          method: "PUT",
          body: JSON.stringify({
            config: {
              ...(config as Record<string, unknown>),
              [field]: nextValue
            }
          })
        });
        router.refresh();
      } catch {
        toast.push("Failed to save content", "error");
      } finally {
        setInlineSaving(false);
      }
    },
    [component.comp_id, component.type, config, inlineSaving, router, toast]
  );

  const handleInlineMouseDown = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!isAuthor || !isInlineEditable) return;
      if (menuType) return;
      if (event.button !== 0) return;
      if (event.detail > 1) return;
      const editable = inlineEditableRef.current;
      if (!editable) return;
      if (isInteractiveTarget(event.target)) return;
      if (!editable.contains(event.target as Node)) {
        event.preventDefault();
      }
      setFocusedNodeId(node.node.node_id);
      editable.focus();
      const selection = window.getSelection();
      const range = getCaretRangeFromPoint(event.clientX, event.clientY);
      if (range && editable.contains(range.startContainer)) {
        selection?.removeAllRanges();
        selection?.addRange(range);
        return;
      }
      const length = editable.textContent?.length ?? 0;
      setCaretPosition(editable, length);
    },
    [isAuthor, isInlineEditable, menuType, node.node.node_id, setFocusedNodeId]
  );

  const handleGroupMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!isAuthor || component.type !== "Group") return;
      if (dragScope?.isDragging) return;
      if (isInteractiveTarget(event.target)) return;
      const container = event.currentTarget;
      const parentId = String(node.node.node_id);
      const candidates = Array.from(
        container.querySelectorAll(`[data-parent-id='${parentId}'][data-navigable='true']`)
      ) as HTMLElement[];
      const lineUnits = candidates
        .filter((element) => {
          const type = element.dataset.componentType ?? "";
          if (type === "Group" || type === "GroupMarker") return false;
          if (element.dataset.edgeMarker) return false;
          return true;
        })
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => event.clientY >= rect.top && event.clientY <= rect.bottom);

      if (!lineUnits.length) return;

      const rightmost = lineUnits.reduce((prev, current) =>
        current.rect.right > prev.rect.right ? current : prev
      );

      if (event.clientX <= rightmost.rect.right + 1) return;

      event.preventDefault();
      event.stopPropagation();

      const nodeId = Number(rightmost.element.dataset.nodeId ?? "");
      if (!nodeId) return;
      setFocusedNodeId(nodeId);

      const type = rightmost.element.dataset.componentType ?? "";
      if (inlineEditableTypes.has(type)) {
        setPendingInlineFocusId(nodeId);
        const editable = rightmost.element.querySelector("[contenteditable='true']") as HTMLElement | null;
        if (editable) {
          const range = document.createRange();
          range.selectNodeContents(editable);
          range.collapse(false);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          editable.focus();
          return;
        }
      }

      rightmost.element.focus();
    },
    [component.type, dragScope, isAuthor, node.node.node_id, setFocusedNodeId, setPendingInlineFocusId]
  );

  const deleteInlineText = useCallback(
    async () => {
      if (inlineSaving) return;
      setInlineSaving(true);
      try {
        await apiFetch(`/nodes/${node.node.node_id}`, { method: "DELETE" });
        router.refresh();
      } catch {
        toast.push("Failed to delete text", "error");
      } finally {
        setInlineSaving(false);
      }
    },
    [inlineSaving, node.node.node_id, router, toast]
  );

  const insertDividorAndTextAfter = useCallback(
    async (currentValue: string, saveField: "text" | "code" | "label", currentSaved: string) => {
      const parentId = node.node.parent_node_id;
      if (!parentId || inlineSaving || isInsertingRef.current) return;
      const trimmed = currentValue.trim();
      if (!trimmed) {
        await deleteInlineText();
        return;
      }
      setInlineSaving(true);
      isInsertingRef.current = true;
      try {
        if (currentValue !== currentSaved) {
          await apiFetch(`/components/${component.type}/${component.comp_id}`, {
            method: "PUT",
            body: JSON.stringify({
              config: {
                ...(config as Record<string, unknown>),
                [saveField]: currentValue
              }
            })
          });
        }

        const nextSiblingId = node.node.next_node_id;
        const dividorNode = await apiFetch<NodeRecord>(`/nodes/${parentId}/children`, {
          method: "POST",
          body: JSON.stringify({ component_type: "DividorUnit", config: {} })
        });
        if (nextSiblingId) {
          await apiFetch(`/nodes/${dividorNode.node_id}/reparent`, {
            method: "PUT",
            body: JSON.stringify({ target_parent_node_id: parentId, before_node_id: nextSiblingId })
          });
        }

        const textNode = await apiFetch<NodeRecord>(`/nodes/${parentId}/children`, {
          method: "POST",
          body: JSON.stringify({ component_type: "PlainTextUnit", config: { text: "" } })
        });
        if (nextSiblingId) {
          await apiFetch(`/nodes/${textNode.node_id}/reparent`, {
            method: "PUT",
            body: JSON.stringify({ target_parent_node_id: parentId, before_node_id: nextSiblingId })
          });
        }
        setFocusedNodeId(textNode.node_id);
        setPendingInlineFocusId(textNode.node_id);
        router.refresh();
      } catch {
        toast.push("Failed to add dividor", "error");
      } finally {
        isInsertingRef.current = false;
        setInlineSaving(false);
      }
    },
    [component.comp_id, component.type, config, deleteInlineText, inlineSaving, node.node.next_node_id, node.node.parent_node_id, router, setFocusedNodeId, setPendingInlineFocusId, toast]
  );

  const insertTextAfter = useCallback(async () => {
    const parentId = node.node.parent_node_id;
    if (!parentId) return null;
    if (isInsertingRef.current) return null;
    isInsertingRef.current = true;
    try {
      const newNode = await apiFetch<NodeRecord>(`/nodes/${parentId}/children`, {
        method: "POST",
        body: JSON.stringify({ component_type: "PlainTextUnit", config: { text: "" } })
      });
      const nextSiblingId = node.node.next_node_id;
      if (nextSiblingId) {
        await apiFetch(`/nodes/${newNode.node_id}/reparent`, {
          method: "PUT",
          body: JSON.stringify({ target_parent_node_id: parentId, before_node_id: nextSiblingId })
        });
      }
      setFocusedNodeId(newNode.node_id);
      setPendingInlineFocusId(newNode.node_id);
      router.refresh();
      return newNode;
    } catch {
      toast.push("Failed to add text", "error");
      return null;
    } finally {
      isInsertingRef.current = false;
    }
  }, [node.node.next_node_id, node.node.parent_node_id, router, setFocusedNodeId, setPendingInlineFocusId, toast]);

  const insertTextAtGroupStart = useCallback(async () => {
    if (!isAuthor) return;
    if (component.type !== "Group") return;
    if (isInsertingRef.current) return;
    isInsertingRef.current = true;
    try {
      const newNode = await apiFetch<NodeRecord>(`/nodes/${node.node.node_id}/children`, {
        method: "POST",
        body: JSON.stringify({ component_type: "PlainTextUnit", config: { text: "" } })
      });
      const firstChildId = node.children[0]?.node.node_id ?? null;
      if (firstChildId) {
        await apiFetch(`/nodes/${newNode.node_id}/reparent`, {
          method: "PUT",
          body: JSON.stringify({ target_parent_node_id: node.node.node_id, before_node_id: firstChildId })
        });
      }
      setFocusedNodeId(newNode.node_id);
      setPendingInlineFocusId(newNode.node_id);
      router.refresh();
    } catch {
      toast.push("Failed to add text", "error");
    } finally {
      isInsertingRef.current = false;
    }
  }, [component.type, isAuthor, node.children, node.node.node_id, router, setFocusedNodeId, setPendingInlineFocusId, toast]);

  const advanceToNextText = useCallback(
    async (currentValue: string, saveKind: "text" | "code" | "label", currentSaved: string) => {
      if (inlineSaving || isInsertingRef.current) return;
      if (saveKind === "text") {
        await saveInlineText(currentValue);
      } else if (saveKind === "code") {
        await saveInlineField("code", currentValue, currentSaved);
      } else if (saveKind === "label") {
        await saveInlineField("label", currentValue, currentSaved);
      }
      await insertTextAfter();
    },
    [inlineSaving, insertTextAfter, saveInlineField, saveInlineText]
  );

  function isCompatibleDrop(draggedType: string, targetType: string, targetConfig: Record<string, unknown>) {
    const kind = resolveGroupKind(targetType, targetConfig);
    if (kind !== "list") return true;
    const listType = String((targetConfig as { listType?: string }).listType ?? "");
    if (!listType) return true;
    if (listType === "View") {
      return draggedType === "LinkUnit";
    }
    return true;
  }

  useEffect(() => {
    if (!isDragging) {
      setContainerDropActive(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (!isScopeComponent(component.type)) return;
    if (activeScopeId !== node.node.node_id) {
      setContainerDropActive(false);
    }
  }, [activeScopeId, component.type, node.node.node_id]);

  if (isScopeComponent(component.type)) {
    const isGroupScope = component.type === "Group";
    const groupKind = resolveGroupKind(component.type, config as Record<string, unknown>);
    const displayMode = String((config as { displayMode?: string }).displayMode ?? "list");
    const isTransparent = Boolean((config as { isTransparent?: boolean }).isTransparent);
    const isScopeActive = activeScopeId === node.node.node_id;
    const showScopeUp = Boolean(isDragging && isScopeActive && node.node.parent_node_id);
    const hasChildren = node.children.length > 0;
    const hasPrevGroupSibling = previousSiblingType === "Group";
    const styleClass = isGroupScope
      ? groupKind === "style"
        ? `style-container${isTransparent ? " style-container--transparent" : ""}`
        : groupKind === "inline"
          ? "inline-container"
          : displayMode === "grid"
            ? "section"
            : "section"
      : "container-node";
    const scopeType = isGroupScope ? "group" : "container";
    const isSubGroup = isGroupScope && parentType === "Group";
    const containerClass = `${styleClass} scope-node${isSubGroup ? " sub-group" : ""}${isAuthor ? " component-card" : ""}${containerDropActive ? " container-drop" : ""}${showScopeUp ? " scope-parent scope-up" : ""}`;
    const scopeAnchorId = isGroupScope ? `group-${node.node.node_id}` : undefined;
    return (
      <div
        className={containerClass}
        id={scopeAnchorId}
        data-container-id={node.node.node_id}
        data-scope-type={scopeType}
        data-node-id={node.node.node_id}
        data-parent-id={node.node.parent_node_id ?? ""}
        data-component-type={component.type}
        data-navigable={isGroupScope ? "true" : undefined}
        onMouseDown={handleGroupMouseDown}
        onClick={(event) => {
          if (!isAuthor) return;
          if (isInteractiveTarget(event.target)) return;
          const target = event.target as HTMLElement | null;
          const closest = target?.closest("[data-container-id]");
          if (!closest) return;
          const containerId = Number(closest.getAttribute("data-container-id"));
          if (containerId !== node.node.node_id) return;
          setActiveContainerId(node.node.node_id);
          setFocusedNodeId(node.node.node_id);
        }}
        onDragOver={(event) => {
          if (!isAuthor || !isScopeActive) return;
          event.preventDefault();
          setContainerDropActive(true);
        }}
        onDragLeave={() => {
          if (!isAuthor || !isScopeActive) return;
          setContainerDropActive(false);
        }}
        onDrop={(event) => {
          if (!isAuthor || !isScopeActive) return;
          event.preventDefault();
          setContainerDropActive(false);
          try {
            const raw = event.dataTransfer.getData("application/json");
            if (!raw) return;
            const parsed = JSON.parse(raw) as { nodeId: number; componentType: string };
            if (!isCompatibleDrop(parsed.componentType, component.type, config as Record<string, unknown>)) {
              toast.push("Incompatible item for this list", "error");
              return;
            }
            const draggedId = parsed.nodeId;
            const currentIndex = node.children.findIndex((child) => child.node.node_id === draggedId);
            if (currentIndex >= 0) {
              const targetIndex = node.children.length - 1;
              if (targetIndex === currentIndex) return;
              const direction = currentIndex < targetIndex ? "down" : "up";
              const steps = Math.abs(targetIndex - currentIndex);
              (async () => {
                try {
                  for (let i = 0; i < steps; i += 1) {
                    await apiFetch(`/nodes/${draggedId}/move`, {
                      method: "PUT",
                      body: JSON.stringify({ direction })
                    });
                  }
                  toast.push("Order updated", "success");
                  router.refresh();
                } catch {
                  toast.push("Reorder failed", "error");
                  router.refresh();
                }
              })();
              return;
            }
            (async () => {
              try {
                await apiFetch(`/nodes/${draggedId}/reparent`, {
                  method: "PUT",
                  body: JSON.stringify({ target_parent_node_id: node.node.node_id })
                });
                toast.push("Moved into container", "success");
                router.refresh();
              } catch {
                toast.push("Move failed", "error");
              }
            })();
          } catch {
            toast.push("Move failed", "error");
          }
        }}
      >
        {showScopeUp && node.node.parent_node_id ? (
          <ScopeArrow direction="up" targetScopeId={node.node.parent_node_id} active={Boolean(dragScope?.isDragging)} />
        ) : null}
        {isAuthor && isGroupScope && hasChildren && !hasPrevGroupSibling ? (
          <button
            className="group-edge-marker-wrap group-edge-marker-wrap--start"
            type="button"
            aria-label="Add text at start of group"
            data-edge-marker="start"
            data-parent-id={node.node.node_id}
            data-node-id={node.node.node_id}
            data-component-type="GroupMarker"
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              if (dragScope?.isDragging) return;
              event.preventDefault();
              insertTextAtGroupStart();
            }}
          >
            <span className="group-edge-marker group-edge-marker--start" aria-hidden="true" />
          </button>
        ) : null}
        {isAuthor ? (
          <SortableChildren
            nodes={node.children}
            enabled={isAuthor}
            containerNodeId={node.node.node_id}
            containerType={component.type}
            containerConfig={config as Record<string, unknown>}
            isCompatible={isCompatibleDrop}
          />
        ) : (
          node.children.map((child, index) => (
            <ViewComponentRenderer
              key={child.node.node_id}
              node={child}
              parentType={component.type}
              previousSiblingType={node.children[index - 1]?.component.type ?? null}
              nextSiblingType={node.children[index + 1]?.component.type ?? null}
            />
          ))
        )}
        {isAuthor && isGroupScope ? (
          <GroupEndComposer groupNodeId={node.node.node_id} />
        ) : null}
      </div>
    );
  }

  switch (component.type) {
    case "PlainTextUnit":
      const closeMenu = (restoreCaret = true) => {
        setMenuType(null);
        setMenuSplit(null);
        setMenuQuery("");
        setMenuIndex(0);
        const caretIndex = menuCaretIndex;
        setMenuCaretIndex(null);
        if (restoreCaret && caretIndex !== null) {
          const target = inlineEditableRef.current;
          if (target) {
            requestAnimationFrame(() => {
              setCaretPosition(target, caretIndex);
            });
          }
        }
      };

      const updateMenuQuery = (nextQuery: string) => {
        setMenuQuery(nextQuery);
        setMenuIndex(0);
      };

      const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!filteredMenuOptions.length) return;
          setMenuIndex((prev) => {
            const next = prev + 1;
            return next >= filteredMenuOptions.length ? 0 : next;
          });
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          if (!filteredMenuOptions.length) return;
          setMenuIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? filteredMenuOptions.length - 1 : next;
          });
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const selected = filteredMenuOptions[menuIndex];
          if (selected) {
            selectMenuOption(selected);
          }
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          closeMenu();
          return;
        }
        if (event.key === "Backspace") {
          if (!menuQuery) return;
          event.preventDefault();
          updateMenuQuery(menuQuery.slice(0, -1));
          return;
        }
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
          updateMenuQuery(`${menuQuery}${event.key}`);
        }
      };

      menuItemRefs.current = [];
      const menuItems = filteredMenuOptions.map((option, index) => (
        <button
          key={option.id}
          className={`text-unit-menu-item${index === menuIndex ? " is-active" : ""}`}
          type="button"
          ref={(el) => {
            menuItemRefs.current[index] = el;
          }}
          role="option"
          aria-selected={index === menuIndex}
          onClick={() => selectMenuOption(option)}
          disabled={inlineSaving}
        >
          {option.label}
        </button>
      ));

      const isTextFocused = focusedNodeId === node.node.node_id;
      const menuHint = menuType === "style"
        ? "Style menu (coming soon)"
        : menuQuery
          ? `Filter: ${menuQuery}`
          : "Type to filter";
      const emptyLabel = menuType === "style" ? "Style menu coming soon" : "No matches";

      return (
        <div
          className={`text-unit${isTextFocused ? " text-unit--focused" : ""}${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          onMouseDown={handleInlineMouseDown}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          {isAuthor ? (
            <span
              ref={(el) => {
                inlineEditableRef.current = el;
              }}
              className="inline-text-span"
              contentEditable
              suppressContentEditableWarning
              onBeforeInput={(event) => {
                if (menuType) {
                  event.preventDefault();
                }
              }}
              onInput={(event) => {
                if (menuType) return;
                const nextValue = event.currentTarget.textContent ?? "";
                inlineValueRef.current = nextValue;
              }}
              onFocus={(event) => {
                inlineValueRef.current = event.currentTarget.textContent ?? "";
                setIsEditingInline(true);
                setFocusedNodeId(node.node.node_id);
              }}
              onBlur={(event) => {
                const nextValue = event.currentTarget.textContent ?? "";
                inlineValueRef.current = nextValue;
                setIsEditingInline(false);
                if (menuType) {
                  window.setTimeout(() => {
                    if (menuRef.current?.contains(document.activeElement)) {
                      return;
                    }
                    closeMenu(false);
                    if (!nextValue.trim()) {
                      deleteInlineText();
                      return;
                    }
                    saveInlineText(nextValue);
                  }, 0);
                  return;
                }
                if (!nextValue.trim()) {
                  deleteInlineText();
                  return;
                }
                saveInlineText(nextValue);
              }}
              onKeyDown={(event) => {
                if (menuType) {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeMenu();
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                  }
                  return;
                }
                if (event.key === "ArrowRight" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                  const target = event.currentTarget;
                  if (isCaretAtEnd(target)) {
                    event.preventDefault();
                    const currentValue = target.textContent ?? "";
                    advanceToNextText(currentValue, "text", textValue);
                    return;
                  }
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  const currentValue = event.currentTarget.textContent ?? "";
                  inlineValueRef.current = currentValue;
                  if (!isCaretAtEnd(event.currentTarget)) {
                    return;
                  }
                  if (!currentValue.trim()) {
                    deleteInlineText();
                    return;
                  }
                  insertDividorAndTextAfter(currentValue, "text", textValue);
                }
              }}
            >
              {isEditingInline ? inlineValueRef.current : textValue}
            </span>
          ) : (
            <p>{textValue}</p>
          )}
          {isAuthor && menuType ? (
            <div
              className="text-unit-menu"
              ref={menuRef}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onKeyDown={handleMenuKeyDown}
              onBlur={() => {
                window.setTimeout(() => {
                  if (menuRef.current?.contains(document.activeElement)) {
                    return;
                  }
                  closeMenu(false);
                }, 0);
              }}
              role="listbox"
              tabIndex={-1}
            >
              <div className="text-unit-menu-filter">
                {menuHint}
              </div>
              {filteredMenuOptions.length ? (
                menuItems
              ) : (
                <div className="text-unit-menu-empty">{emptyLabel}</div>
              )}
            </div>
          ) : null}
        </div>
      );
    case "DividorUnit":
      return (
        <div
          className={`dividor-unit${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          <div className="dividor" role="separator" />
        </div>
      );
    case "CodeUnit":
      return (
        <div
          className={`section-card code-unit-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          onMouseDown={handleInlineMouseDown}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          {isAuthor ? (
            <code
              ref={(el) => {
                inlineEditableRef.current = el;
              }}
              className="code-inline"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onFocus={(event) => {
                inlineValueRef.current = event.currentTarget.textContent ?? "";
                setIsEditingInline(true);
                setFocusedNodeId(node.node.node_id);
              }}
              onInput={(event) => {
                inlineValueRef.current = event.currentTarget.textContent ?? "";
              }}
              onBlur={(event) => {
                const nextValue = event.currentTarget.textContent ?? "";
                inlineValueRef.current = nextValue;
                setIsEditingInline(false);
                saveInlineField("code", nextValue, codeValue);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                  const target = event.currentTarget;
                  if (isCaretAtEnd(target)) {
                    event.preventDefault();
                    const currentValue = target.textContent ?? "";
                    advanceToNextText(currentValue, "code", codeValue);
                  }
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  const target = event.currentTarget;
                  if (!isCaretAtEnd(target)) return;
                  const currentValue = target.textContent ?? "";
                  inlineValueRef.current = currentValue;
                  if (!currentValue.trim()) {
                    deleteInlineText();
                    return;
                  }
                  insertDividorAndTextAfter(currentValue, "code", codeValue);
                }
              }}
            >
              {isEditingInline ? inlineValueRef.current : codeValue}
            </code>
          ) : (
            <code className="code-inline">{codeValue}</code>
          )}
        </div>
      );
    case "CodeBlockUnit":
      return (
        <div
          className={`section-card code-unit-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          onMouseDown={handleInlineMouseDown}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          <pre className="code-block">
            {isAuthor ? (
              <code
                ref={(el) => {
                  inlineEditableRef.current = el;
                }}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onFocus={(event) => {
                  inlineValueRef.current = event.currentTarget.textContent ?? "";
                  setIsEditingInline(true);
                  setFocusedNodeId(node.node.node_id);
                }}
                onInput={(event) => {
                  inlineValueRef.current = event.currentTarget.textContent ?? "";
                }}
                onBlur={(event) => {
                  const nextValue = event.currentTarget.textContent ?? "";
                  inlineValueRef.current = nextValue;
                  setIsEditingInline(false);
                  saveInlineField("code", nextValue, codeValue);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                    const target = event.currentTarget;
                    if (isCaretAtEnd(target)) {
                      event.preventDefault();
                      const currentValue = target.textContent ?? "";
                      advanceToNextText(currentValue, "code", codeValue);
                    }
                  }
                }}
              >
                {isEditingInline ? inlineValueRef.current : codeValue}
              </code>
            ) : (
              <code>{codeValue}</code>
            )}
          </pre>
        </div>
      );
    case "AlertUnit":
      return (
        <div
          className={`section-card${isAuthor ? " component-card" : ""}`}
          role="status"
          onClick={handleComponentFocus}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          <strong>{String((config as { variant?: string }).variant ?? "info").toUpperCase()}</strong>
          <p>{String((config as { content?: string }).content ?? "")}</p>
        </div>
      );
    case "MarkdownUnit":
      return (
        <div
          className={`section-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          onMouseDown={handleInlineMouseDown}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          <ReactMarkdown>{String((config as { content?: string }).content ?? "")}</ReactMarkdown>
        </div>
      );
    case "LinkUnit":
      return (
        <div
          className={`section-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          onMouseDown={handleInlineMouseDown}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          {isAuthor ? (
            <a
              ref={(el) => {
                inlineEditableRef.current = el;
              }}
              href={String((config as { url?: string }).url ?? "#")}
              contentEditable
              suppressContentEditableWarning
              onClick={(event) => {
                event.preventDefault();
              }}
              onFocus={(event) => {
                inlineValueRef.current = event.currentTarget.textContent ?? "";
                setIsEditingInline(true);
                setFocusedNodeId(node.node.node_id);
              }}
              onInput={(event) => {
                inlineValueRef.current = event.currentTarget.textContent ?? "";
              }}
              onBlur={(event) => {
                const nextValue = event.currentTarget.textContent ?? "";
                inlineValueRef.current = nextValue;
                setIsEditingInline(false);
                saveInlineField("label", nextValue, linkLabel);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                  const target = event.currentTarget;
                  if (isCaretAtEnd(target)) {
                    event.preventDefault();
                    const currentValue = target.textContent ?? "";
                    advanceToNextText(currentValue, "label", linkLabel);
                  }
                }
              }}
            >
              {isEditingInline ? inlineValueRef.current : linkLabel || "Link"}
            </a>
          ) : (
            <a href={String((config as { url?: string }).url ?? "#")}>{linkLabel || "Link"}</a>
          )}
        </div>
      );
    case "ButtonUnit":
      return (
        <div
          className={`section-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          <a
            className="content-button"
            href={String((config as { url?: string }).url ?? "#")}
          >
            {String((config as { label?: string }).label ?? "Button")}
          </a>
        </div>
      );
    case "ImageMedia":
      return (
        <div
          className={`section-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          {String((config as { src?: string }).src ?? "") ? (
            <Image
              src={String((config as { src?: string }).src ?? "")}
              alt={String((config as { alt?: string }).alt ?? "")}
              width={960}
              height={640}
              unoptimized
              style={{ width: "100%", height: "auto", borderRadius: 12 }}
            />
          ) : null}
        </div>
      );
    case "VideoMedia":
      return (
        <div
          className={`section-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          <video
            controls
            autoPlay={Boolean((config as { autoplay?: boolean }).autoplay)}
            src={String((config as { src?: string }).src ?? "")}
            style={{ width: "100%", borderRadius: 12 }}
          />
        </div>
      );
    case "PDFMedia":
      return (
        <div
          className={`section-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          <iframe
            src={String((config as { src?: string }).src ?? "")}
            title={String((config as { title?: string }).title ?? "Document")}
            style={{ width: "100%", minHeight: 500, border: "none" }}
          />
        </div>
      );
    case "ExperienceComponent":
      return (
        <div
          className={`section-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          <h3>{String((config as { position?: string }).position ?? "Role")}</h3>
          <p>{String((config as { company?: string }).company ?? "")}</p>
          <p>{String((config as { content?: string }).content ?? "")}</p>
        </div>
      );
    default:
      return (
        <div
          className={`section-card${isAuthor ? " component-card" : ""}`}
          onClick={handleComponentFocus}
          id={unitAnchorId}
          data-node-id={node.node.node_id}
          data-parent-id={node.node.parent_node_id ?? ""}
          data-component-type={component.type}
          data-navigable="true"
        >
          <p>Unsupported component type: {component.type}</p>
        </div>
      );
  }
}
