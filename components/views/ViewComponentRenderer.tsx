"use client";

import type { ResolvedNode } from "@/lib/content/types";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { ComponentEditor } from "@/components/author/ComponentEditor";
import { AddComponentModalButton } from "@/components/author/AddComponentModalButton";
import { useDragScope } from "@/components/views/DragScopeProvider";

const containerTypes = new Set(["ViewContainer", "ListContainer", "InlineContainer", "StyleContainer"]);

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

function SortableChildren({
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
    const toIndex = items.findIndex((item) => item.node.node_id === targetId);
    if (toIndex < 0) return;
    if (fromIndex < 0) {
      try {
        await apiFetch(`/nodes/${draggedId}/reparent`, {
          method: "PUT",
          body: JSON.stringify({
            target_parent_node_id: containerNodeId,
            before_node_id: targetId
          })
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
  }

  const draggingIndex = isActiveScope && draggingId ? items.findIndex((item) => item.node.node_id === draggingId) : -1;

  return (
    <div className="sortable-list">
      {items.map((child, index) => {
        const isContainer = containerTypes.has(child.component.type);
        const isAdjacent = draggingIndex >= 0 && Math.abs(index - draggingIndex) === 1;
        const showDownArrow = isActiveScope && isContainer && isAdjacent;
        const showDownOutline = isActiveScope && isContainer && isDragging;
        return (
        <div
          key={child.node.node_id}
          className={`draggable-item${draggingId === child.node.node_id ? " dragging" : ""}${dropTargetId === child.node.node_id ? " drag-over" : ""}${showDownOutline ? " scope-down" : ""}`}
          draggable={enabled}
          onDragStart={(event) => {
            if (!enabled) return;
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
          }}
          onDragOver={(event) => {
            if (!enabled || !isActiveScope) return;
            event.preventDefault();
            setDropTargetId(child.node.node_id);
          }}
          onDrop={(event) => handleDrop(event, child.node.node_id)}
        >
          {showDownArrow ? (
            <ScopeArrow direction="down" targetScopeId={child.node.node_id} active={isDragging} />
          ) : null}
          <ViewComponentRenderer node={child} />
        </div>
        );
      })}
    </div>
  );
}

export function ViewComponentRenderer({ node }: { node: ResolvedNode }) {
  const { component, config } = node;
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const toast = useToast();
  const router = useRouter();
  const [containerDropActive, setContainerDropActive] = useState(false);
  const dragScope = useDragScope();
  const isDragging = Boolean(dragScope?.isDragging);
  const activeScopeId = dragScope?.activeScopeId ?? null;

  function isCompatibleDrop(draggedType: string, targetType: string, targetConfig: Record<string, unknown>) {
    if (targetType !== "ListContainer") return true;
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
    if (!containerTypes.has(component.type)) return;
    if (activeScopeId !== node.node.node_id) {
      setContainerDropActive(false);
    }
  }, [activeScopeId, component.type, node.node.node_id]);

  if (
    component.type === "ViewContainer" ||
    component.type === "ListContainer" ||
    component.type === "InlineContainer" ||
    component.type === "StyleContainer"
  ) {
    const displayMode = String((config as { displayMode?: string }).displayMode ?? "list");
    const isTransparent = Boolean((config as { isTransparent?: boolean }).isTransparent);
    const isScopeActive = activeScopeId === node.node.node_id;
    const showScopeUp = Boolean(isDragging && isScopeActive && node.node.parent_node_id);
    const styleClass =
      component.type === "StyleContainer"
        ? `style-container${isTransparent ? " style-container--transparent" : ""}`
        : displayMode === "grid"
          ? "section"
          : "section";
    const containerClass = `${styleClass}${isAuthor ? " component-card" : ""}${containerDropActive ? " container-drop" : ""}${showScopeUp ? " scope-parent scope-up" : ""}`;
    return (
      <div
        className={containerClass}
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
        {isAuthor ? (
          <ComponentEditor
            nodeId={node.node.node_id}
            compId={component.comp_id}
            componentType={component.type}
            config={config}
          />
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
          node.children.map((child) => (
            <ViewComponentRenderer key={child.node.node_id} node={child} />
          ))
        )}
        {isAuthor ? <AddComponentModalButton parentNodeId={node.node.node_id} /> : null}
      </div>
    );
  }

  switch (component.type) {
    case "SectionUnit": {
      const level = (config as { level?: string }).level ?? "h2";
      const Tag = level === "h1" ? "h1" : level === "h3" ? "h3" : "h2";
      return (
        <div className={`section-card${isAuthor ? " component-card" : ""}`}>
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
          <Tag id={`section-${node.node.node_id}`}>
            {String((config as { text?: string }).text ?? "Untitled section")}
          </Tag>
        </div>
      );
    }
    case "PlainTextUnit":
      return (
        <div className={`section-card${isAuthor ? " component-card" : ""}`}>
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
          <p>{String((config as { text?: string }).text ?? "")}</p>
        </div>
      );
    case "AlertUnit":
      return (
        <div className={`section-card${isAuthor ? " component-card" : ""}`} role="status">
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
          <strong>{String((config as { variant?: string }).variant ?? "info").toUpperCase()}</strong>
          <p>{String((config as { content?: string }).content ?? "")}</p>
        </div>
      );
    case "MarkdownUnit":
      return (
        <div className={`section-card${isAuthor ? " component-card" : ""}`}>
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
          <ReactMarkdown>{String((config as { content?: string }).content ?? "")}</ReactMarkdown>
        </div>
      );
    case "LinkUnit":
      return (
        <div className={`section-card${isAuthor ? " component-card" : ""}`}>
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
          <a href={String((config as { url?: string }).url ?? "#")}>{String((config as { label?: string }).label ?? "Link")}</a>
        </div>
      );
    case "ImageMedia":
      return (
        <div className={`section-card${isAuthor ? " component-card" : ""}`}>
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
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
        <div className={`section-card${isAuthor ? " component-card" : ""}`}>
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
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
        <div className={`section-card${isAuthor ? " component-card" : ""}`}>
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
          <iframe
            src={String((config as { src?: string }).src ?? "")}
            title={String((config as { title?: string }).title ?? "Document")}
            style={{ width: "100%", minHeight: 500, border: "none" }}
          />
        </div>
      );
    case "ExperienceComponent":
      return (
        <div className={`section-card${isAuthor ? " component-card" : ""}`}>
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
          <h3>{String((config as { position?: string }).position ?? "Role")}</h3>
          <p>{String((config as { company?: string }).company ?? "")}</p>
          <p>{String((config as { content?: string }).content ?? "")}</p>
        </div>
      );
    default:
      return (
        <div className={`section-card${isAuthor ? " component-card" : ""}`}>
          {isAuthor ? (
            <ComponentEditor
              nodeId={node.node.node_id}
              compId={component.comp_id}
              componentType={component.type}
              config={config}
            />
          ) : null}
          <p>Unsupported component type: {component.type}</p>
        </div>
      );
  }
}
