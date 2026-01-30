"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createView, listViews } from "@/lib/content/views.client";
import { apiFetch } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import type { ViewSummary } from "@/lib/content/types";

const reservedPrefixes = ["/settings", "/feed.xml", "/api"];

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M10 2.5 6.5 6h2.2v8H6.5L10 17.5 13.5 14h-2.2V6h2.2L10 2.5z"
      />
    </svg>
  );
}

function normalizePath(path: string) {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path.replace(/\/$/, "") || "/";
}

function sortViews(list: ViewSummary[]) {
  return [...list].sort((a, b) => {
    const aOrder = Number((a.config as { order?: number }).order ?? 0);
    const bOrder = Number((b.config as { order?: number }).order ?? 0);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.config.title ?? a.config.name ?? "").localeCompare(
      String(b.config.title ?? b.config.name ?? "")
    );
  });
}

function groupViewsByComponent(list: ViewSummary[]) {
  const grouped = new Map<number, ViewSummary[]>();
  for (const view of list) {
    const bucket = grouped.get(view.comp_id) ?? [];
    bucket.push(view);
    grouped.set(view.comp_id, bucket);
  }
  return grouped;
}

function describeShared(paths: string[], currentPath: string) {
  const others = paths.filter((path) => path && path !== currentPath);
  if (!others.length) return null;
  if (others.length <= 3) {
    return `Shared with: ${others.join(", ")}`;
  }
  return `Shared with: ${others.slice(0, 3).join(", ")} and ${others.length - 3} more`;
}

function getPathError(
  nextPath: string,
  views: ViewSummary[],
  excludeRefId?: number
) {
  if (!nextPath.trim()) return "Path is required.";
  const normalized = normalizePath(nextPath.trim());
  if (reservedPrefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    return "This path is reserved.";
  }
  if (views.some((view) => view.config.path === normalized && view.ref_id !== excludeRefId)) {
    return "Path already exists.";
  }
  return null;
}

export function ViewsPanel() {
  const [views, setViews] = useState<ViewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [homeNodeId, setHomeNodeId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { title: string; path: string; description: string }>>({});
  const [pendingDelete, setPendingDelete] = useState<ViewSummary | null>(null);
  const [duplicateId, setDuplicateId] = useState<number | null>(null);
  const [duplicateDrafts, setDuplicateDrafts] = useState<
    Record<number, { title: string; path: string; description: string }>
  >({});
  const [mirrorId, setMirrorId] = useState<number | null>(null);
  const [mirrorDrafts, setMirrorDrafts] = useState<
    Record<number, { title: string; path: string; description: string }>
  >({});
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [pendingDetach, setPendingDetach] = useState<ViewSummary | null>(null);
  const [pendingDetachAll, setPendingDetachAll] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const toast = useToast();
  const [editSaveStatus, setEditSaveStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [lastEditSnapshot, setLastEditSnapshot] = useState<string>("");
  const [draggingViewId, setDraggingViewId] = useState<number | null>(null);
  const [dropTargetViewId, setDropTargetViewId] = useState<number | null>(null);

  const groupedViews = useMemo(() => groupViewsByComponent(views), [views]);
  const sharedGroups = useMemo(
    () => Array.from(groupedViews.values()).filter((group) => group.length > 1),
    [groupedViews]
  );
  const hasSharedViews = sharedGroups.length > 0;
  const filteredViews = showSharedOnly
    ? views.filter((view) => (groupedViews.get(view.comp_id)?.length ?? 0) > 1)
    : views;

  async function handleViewDrop(targetRefId: number) {
    if (showSharedOnly) {
      toast.push("Disable shared-only filter to reorder", "info");
      return;
    }
    if (!draggingViewId || draggingViewId === targetRefId) return;
    const ordered = sortViews(views);
    const fromIndex = ordered.findIndex((item) => item.ref_id === draggingViewId);
    const toIndex = ordered.findIndex((item) => item.ref_id === targetRefId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...ordered];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setViews(next);

    try {
      await Promise.all(
        next.map((view, index) =>
          apiFetch(`/references/${view.ref_id}`, {
            method: "PUT",
            body: JSON.stringify({ overrides: { order: index } })
          })
        )
      );
      toast.push("View order updated", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder views");
      toast.push("Failed to reorder views", "error");
    }
  }


  const pathError = useMemo(() => getPathError(path, views), [path, views]);

  async function refresh() {
    try {
      setLoading(true);
      const [data, home] = await Promise.all([
        listViews(),
        apiFetch<{ root_view_node_id?: number | null }>("/home/root-view")
      ]);
      setViews(sortViews(data));
      setHomeNodeId(home.root_view_node_id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load views");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (pathError) {
      setError(pathError);
      toast.push(pathError, "error");
      return;
    }
    try {
      setError(null);
      const created = await createView({
        path: normalizePath(path.trim()),
        title: title.trim() || "Untitled",
        description: description.trim() || undefined
      });
      setViews((prev) => sortViews([created, ...prev]));
      setPath("");
      setTitle("");
      setDescription("");
      if (!homeNodeId && created.node_id) {
        setHomeNodeId(created.node_id);
      }
      toast.push("View created", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create view");
      toast.push("Failed to create view", "error");
    }
  }

  async function setHome(nodeId: number | null) {
    try {
      await apiFetch("/home/root-view", {
        method: "PUT",
        body: JSON.stringify({ root_view_node_id: nodeId })
      });
      setHomeNodeId(nodeId);
      toast.push("Home view updated", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set home view");
      toast.push("Failed to set home view", "error");
    }
  }

  async function handleDelete(view: ViewSummary) {
    if (!view.node_id) return;
    try {
      await apiFetch(`/views/${view.node_id}`, { method: "DELETE" });
      setViews((prev) => prev.filter((item) => item.ref_id !== view.ref_id));
      if (homeNodeId === view.node_id) {
        setHomeNodeId(null);
      }
      toast.push("View deleted", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete view");
      toast.push("Failed to delete view", "error");
    }
  }

  const saveViewConfig = useCallback(async (view: ViewSummary, draft: { title: string; path: string; description: string }, options?: { silent?: boolean; closeAfter?: boolean }) => {
    const errorMessage = getPathError(draft.path, views, view.ref_id);
    if (errorMessage) {
      setError(errorMessage);
      setEditSaveStatus("error");
      if (!options?.silent) {
        toast.push(errorMessage, "error");
      }
      return;
    }
    const nextPath = normalizePath(draft.path);
    setEditSaveStatus("saving");
    try {
      await apiFetch(`/references/${view.ref_id}`, {
        method: "PUT",
        body: JSON.stringify({
          overrides: {
            title: draft.title,
            name: draft.title,
            path: nextPath,
            browser_title: draft.title,
            description: draft.description
          }
        })
      });
      const nextSnapshot = JSON.stringify({
        title: draft.title,
        path: nextPath,
        description: draft.description
      });
      setLastEditSnapshot(nextSnapshot);
      setViews((prev) =>
        sortViews(
          prev.map((item) =>
            item.ref_id === view.ref_id
              ? { ...item, config: { ...item.config, title: draft.title, name: draft.title, path: nextPath, description: draft.description } }
              : item
          )
        )
      );
      setEditSaveStatus("saved");
      if (options?.closeAfter) {
        setEditingId(null);
      }
      if (!options?.silent) {
        toast.push("View updated", "success");
      }
      setTimeout(() => {
        setEditSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update view");
      setEditSaveStatus("error");
      if (!options?.silent) {
        toast.push("Failed to update view", "error");
      }
    }
  }, [toast, views]);

  useEffect(() => {
    if (!editingId) {
      setEditSaveStatus("idle");
      setLastEditSnapshot("");
      return;
    }
    const view = views.find((item) => item.ref_id === editingId);
    if (!view) return;
    const snapshot = JSON.stringify({
      title: String(view.config.title ?? ""),
      path: String(view.config.path ?? "/"),
      description: String(view.config.description ?? "")
    });
    setLastEditSnapshot(snapshot);
    setEditSaveStatus("idle");
  }, [editingId, views]);

  useEffect(() => {
    if (!editingId) return;
    const draft = drafts[editingId];
    if (!draft) return;
    const view = views.find((item) => item.ref_id === editingId);
    if (!view) return;
    const snapshot = JSON.stringify({
      title: draft.title,
      path: normalizePath(draft.path),
      description: draft.description
    });
    if (snapshot === lastEditSnapshot) {
      if (editSaveStatus === "dirty") {
        setEditSaveStatus("idle");
      }
      return;
    }
    setEditSaveStatus("dirty");
    const timer = setTimeout(() => {
      saveViewConfig(view, draft, { silent: true });
    }, 900);
    return () => clearTimeout(timer);
  }, [drafts, editingId, lastEditSnapshot, views, editSaveStatus, saveViewConfig]);

  async function handleSave(view: ViewSummary) {
    const draft = drafts[view.ref_id];
    if (!draft) return;
    await saveViewConfig(view, draft, { closeAfter: true });
  }

  async function handleDuplicate(view: ViewSummary) {
    const draft = duplicateDrafts[view.ref_id];
    if (!draft) return;
    if (!view.node_id) {
      setError("View node is missing.");
      return;
    }
    const pathErrorMessage = getPathError(draft.path, views);
    if (pathErrorMessage) {
      setError(pathErrorMessage);
      toast.push(pathErrorMessage, "error");
      return;
    }
    const nextPath = normalizePath(draft.path);
    try {
      const created = await apiFetch<ViewSummary>(`/views/${view.node_id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({
          path: nextPath,
          title: draft.title,
          description: draft.description
        })
      });
      setViews((prev) => sortViews([created, ...prev]));
      setDuplicateId(null);
      toast.push("View duplicated", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate view");
      toast.push("Failed to duplicate view", "error");
    }
  }

  async function handleMirror(view: ViewSummary) {
    const draft = mirrorDrafts[view.ref_id];
    if (!draft) return;
    if (!view.node_id) {
      setError("View node is missing.");
      return;
    }
    const pathErrorMessage = getPathError(draft.path, views);
    if (pathErrorMessage) {
      setError(pathErrorMessage);
      toast.push(pathErrorMessage, "error");
      return;
    }
    const nextPath = normalizePath(draft.path);
    try {
      const created = await apiFetch<ViewSummary>(`/views/${view.node_id}/mirror`, {
        method: "POST",
        body: JSON.stringify({
          path: nextPath,
          title: draft.title,
          description: draft.description
        })
      });
      setViews((prev) => sortViews([created, ...prev]));
      setMirrorId(null);
      toast.push("View mirrored", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mirror view");
      toast.push("Failed to mirror view", "error");
    }
  }

  async function handleDetach(view: ViewSummary) {
    if (!view.node_id) {
      setError("View node is missing.");
      return;
    }
    try {
      const detached = await apiFetch<ViewSummary>(`/views/${view.node_id}/detach`, {
        method: "POST"
      });
      setViews((prev) =>
        sortViews(
          prev.map((item) =>
            item.ref_id === view.ref_id ? detached : item
          )
        )
      );
      setPendingDetach(null);
      toast.push("View detached", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to detach view");
      toast.push("Failed to detach view", "error");
    }
  }

  async function handleDetachAll() {
    const targets: ViewSummary[] = [];
    for (const group of sharedGroups) {
      const withNodes = group.filter((view) => view.node_id !== null);
      if (withNodes.length > 1) {
        targets.push(...withNodes.slice(1));
      }
    }
    if (targets.length === 0) {
      toast.push("No shared views to detach", "info");
      setPendingDetachAll(false);
      return;
    }

    const updates = new Map<number, ViewSummary>();
    let failures = 0;
    for (const view of targets) {
      try {
        const detached = await apiFetch<ViewSummary>(`/views/${view.node_id}/detach`, {
          method: "POST"
        });
        updates.set(detached.ref_id, detached);
      } catch {
        failures += 1;
      }
    }

    if (updates.size) {
      setViews((prev) =>
        sortViews(prev.map((item) => updates.get(item.ref_id) ?? item))
      );
    }

    setPendingDetachAll(false);
    if (failures) {
      toast.push("Some views failed to detach", "error");
    } else {
      toast.push("Shared views detached", "success");
    }
  }

  function copyValue(label: string, value: number | null | undefined) {
    if (value === null || value === undefined) return;
    navigator.clipboard?.writeText(String(value));
    toast.push(`Copied ${label}`, "info");
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Views</h2>
        <p>Create and manage view pages.</p>
      </div>
      <form className="form-grid" onSubmit={handleCreate}>
        <label>
          <span>Path</span>
          <input
            value={path}
            onChange={(event) => setPath(event.target.value)}
            placeholder="/about"
          />
          {pathError ? <span className="form-hint error">{pathError}</span> : null}
        </label>
        <label>
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="About"
          />
        </label>
        <label>
          <span>Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional short description"
          />
        </label>
        <button className="button" type="submit" disabled={Boolean(pathError)}>
          Create view
        </button>
      </form>

      {error ? <div className="alert">{error}</div> : null}
      {loading ? <p>Loading views...</p> : null}

      <div className="panel-header">
        <div className="author-actions-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={showSharedOnly}
              onChange={(event) => setShowSharedOnly(event.target.checked)}
            />
            <span>Show shared only</span>
          </label>
          <button
            className="button ghost"
            type="button"
            onClick={() => setShowLegend((prev) => !prev)}
          >
            {showLegend ? "Hide shared info" : "Shared content info"}
          </button>
          <button
            className="button ghost"
            type="button"
            onClick={() => setPendingDetachAll(true)}
            disabled={!hasSharedViews}
          >
            Detach all shared
          </button>
        </div>
        {showLegend ? (
          <div className="legend-card">
            <strong>Shared content</strong>
            <p className="muted">
              Views with the same content tree share a single ViewContainer component.
              Editing content in one updates all shared views.
            </p>
            <p className="muted">
              Use Detach to make a view independent by cloning its content.
            </p>
          </div>
        ) : null}
      </div>

      <div className="list">
        {filteredViews.map((view) => {
          const sharedViews = groupedViews.get(view.comp_id) ?? [];
          const sharedPaths = sharedViews.map((item) => String(item.config.path ?? ""));
          const sharedLabel = describeShared(sharedPaths, String(view.config.path ?? ""));
          const isEditing = editingId === view.ref_id;
          const isDuplicating = duplicateId === view.ref_id;
          const isMirroring = mirrorId === view.ref_id;
          const draft = drafts[view.ref_id] ?? {
            title: String(view.config.title ?? ""),
            path: String(view.config.path ?? "/"),
            description: String(view.config.description ?? "")
          };
          const duplicateDraft = duplicateDrafts[view.ref_id] ?? {
            title: `Copy of ${String(view.config.title ?? "Untitled")}`,
            path: String(view.config.path ?? "/") === "/" ? "/copy" : `${String(view.config.path ?? "")}--copy`,
            description: String(view.config.description ?? "")
          };
          const mirrorDraft = mirrorDrafts[view.ref_id] ?? {
            title: `Mirror of ${String(view.config.title ?? "Untitled")}`,
            path: String(view.config.path ?? "/") === "/" ? "/mirror" : `${String(view.config.path ?? "")}--mirror`,
            description: String(view.config.description ?? "")
          };
          const duplicatePathError = getPathError(duplicateDraft.path, views, view.ref_id);
          const mirrorPathError = getPathError(mirrorDraft.path, views, view.ref_id);
          return (
            <div
              key={view.ref_id}
              className={`list-item column draggable-item${draggingViewId === view.ref_id ? " dragging" : ""}${dropTargetViewId === view.ref_id ? " drag-over" : ""}`}
              onDragOver={(event) => {
                if (showSharedOnly) return;
                event.preventDefault();
                setDropTargetViewId(view.ref_id);
              }}
              onDrop={() => handleViewDrop(view.ref_id)}
            >
              <div className="view-item">
                <strong>{view.config.title ?? "Untitled"}</strong>
                <div className="muted">{view.config.path}</div>
                <div className="badge-row">
                  {homeNodeId === view.node_id ? <span className="badge">Home</span> : null}
                  {sharedViews.length > 1 ? (
                    <span className="badge secondary">Shared x{sharedViews.length}</span>
                  ) : null}
                </div>
                {sharedLabel ? <div className="muted">{sharedLabel}</div> : null}
              </div>
              {isEditing ? (
                <div className="form-grid">
                  <label>
                    <span>Title</span>
                    <input
                      value={draft.title}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [view.ref_id]: { ...draft, title: event.target.value }
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Path</span>
                    <input
                      value={draft.path}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [view.ref_id]: { ...draft, path: event.target.value }
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea
                      value={draft.description}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [view.ref_id]: { ...draft, description: event.target.value }
                        }))
                      }
                    />
                  </label>
                </div>
              ) : null}
              {isDuplicating ? (
                <div className="form-grid">
                  <label>
                    <span>New title</span>
                    <input
                      value={duplicateDraft.title}
                      onChange={(event) =>
                        setDuplicateDrafts((prev) => ({
                          ...prev,
                          [view.ref_id]: { ...duplicateDraft, title: event.target.value }
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>New path</span>
                    <input
                      value={duplicateDraft.path}
                      onChange={(event) =>
                        setDuplicateDrafts((prev) => ({
                          ...prev,
                          [view.ref_id]: { ...duplicateDraft, path: event.target.value }
                        }))
                      }
                    />
                    {duplicatePathError ? (
                      <span className="form-hint error">{duplicatePathError}</span>
                    ) : null}
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea
                      value={duplicateDraft.description}
                      onChange={(event) =>
                        setDuplicateDrafts((prev) => ({
                          ...prev,
                          [view.ref_id]: { ...duplicateDraft, description: event.target.value }
                        }))
                      }
                    />
                  </label>
                  <div className="author-actions-row">
                    <button className="button" type="button" onClick={() => handleDuplicate(view)} disabled={Boolean(duplicatePathError)}>
                      Create copy
                    </button>
                    <button className="button ghost" type="button" onClick={() => setDuplicateId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              {isMirroring ? (
                <div className="form-grid">
                  <label>
                    <span>New title</span>
                    <input
                      value={mirrorDraft.title}
                      onChange={(event) =>
                        setMirrorDrafts((prev) => ({
                          ...prev,
                          [view.ref_id]: { ...mirrorDraft, title: event.target.value }
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>New path</span>
                    <input
                      value={mirrorDraft.path}
                      onChange={(event) =>
                        setMirrorDrafts((prev) => ({
                          ...prev,
                          [view.ref_id]: { ...mirrorDraft, path: event.target.value }
                        }))
                      }
                    />
                    {mirrorPathError ? (
                      <span className="form-hint error">{mirrorPathError}</span>
                    ) : null}
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea
                      value={mirrorDraft.description}
                      onChange={(event) =>
                        setMirrorDrafts((prev) => ({
                          ...prev,
                          [view.ref_id]: { ...mirrorDraft, description: event.target.value }
                        }))
                      }
                    />
                  </label>
                  <div className="author-actions-row">
                    <button className="button" type="button" onClick={() => handleMirror(view)} disabled={Boolean(mirrorPathError)}>
                      Create mirror
                    </button>
                    <button className="button ghost" type="button" onClick={() => setMirrorId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="action-bar">
                <div className="action-group">
                  {!showSharedOnly ? (
                    <button
                      className="drag-handle"
                      type="button"
                      draggable={!showSharedOnly}
                      aria-label="Drag to reorder"
                      title="Drag to reorder"
                      onDragStart={(event) => {
                        setDraggingViewId(view.ref_id);
                        event.dataTransfer.setData("text/plain", String(view.ref_id));
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggingViewId(null);
                        setDropTargetViewId(null);
                      }}
                    >
                      <DragHandleIcon />
                    </button>
                  ) : null}
                </div>
                <div className="action-group">
                  <Link className="button ghost" href={view.config.path ?? "/"}>
                    Open
                  </Link>
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() =>
                      setDetailsId((prev) => (prev === view.ref_id ? null : view.ref_id))
                    }
                  >
                    {detailsId === view.ref_id ? "Hide details" : "Details"}
                  </button>
                </div>
                <div className="action-group action-group--right">
                  {isEditing ? (
                    <button className="button small" type="button" onClick={() => handleSave(view)}>
                      Save
                    </button>
                  ) : null}
                  <button
                    className="button edit small"
                    type="button"
                    onClick={() =>
                      setEditingId((prev) => (prev === view.ref_id ? null : view.ref_id))
                    }
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                  <button className="button danger small" type="button" onClick={() => setPendingDelete(view)}>
                    Delete
                  </button>
                  {isEditing && editSaveStatus !== "idle" ? (
                    <span className={`status-chip status-${editSaveStatus}`}>
                      {editSaveStatus === "dirty" ? "Unsaved changes" : null}
                      {editSaveStatus === "saving" ? "Saving..." : null}
                      {editSaveStatus === "saved" ? "Saved" : null}
                      {editSaveStatus === "error" ? "Save failed" : null}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="action-row">
                <button className="button ghost" type="button" onClick={() => setHome(view.node_id ?? null)}>
                  Set home
                </button>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() =>
                    setDuplicateId((prev) => (prev === view.ref_id ? null : view.ref_id))
                  }
                >
                  {isDuplicating ? "Close copy" : "Duplicate"}
                </button>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() =>
                    setMirrorId((prev) => (prev === view.ref_id ? null : view.ref_id))
                  }
                >
                  {isMirroring ? "Close mirror" : "Mirror"}
                </button>
                {sharedViews.length > 1 ? (
                  <button
                    className="button ghost"
                    type="button"
                    onClick={() => setPendingDetach(view)}
                  >
                    Detach
                  </button>
                ) : null}
              </div>
              {detailsId === view.ref_id ? (
                <div className="details-card">
                  <div className="details-row">
                    <span className="muted">comp_id</span>
                    <code className="details-code">{view.comp_id}</code>
                    <button className="button ghost" type="button" onClick={() => copyValue("comp_id", view.comp_id)}>
                      Copy
                    </button>
                  </div>
                  <div className="details-row">
                    <span className="muted">ref_id</span>
                    <code className="details-code">{view.ref_id}</code>
                    <button className="button ghost" type="button" onClick={() => copyValue("ref_id", view.ref_id)}>
                      Copy
                    </button>
                  </div>
                  <div className="details-row">
                    <span className="muted">node_id</span>
                    <code className="details-code">{view.node_id ?? "-"}</code>
                    <button className="button ghost" type="button" onClick={() => copyValue("node_id", view.node_id ?? null)}>
                      Copy
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        {!loading && views.length === 0 ? <p className="muted">No views yet.</p> : null}
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete view"
        description={
          pendingDelete
            ? `Delete ${pendingDelete.config.title ?? pendingDelete.config.path ?? ""}?`
            : undefined
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            handleDelete(pendingDelete);
          }
          setPendingDelete(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDetach)}
        title="Detach view"
        description="This view will become independent and no longer share content."
        confirmLabel="Detach"
        onCancel={() => setPendingDetach(null)}
        onConfirm={() => {
          if (pendingDetach) {
            handleDetach(pendingDetach);
          }
        }}
      />
      <ConfirmDialog
        open={pendingDetachAll}
        title="Detach all shared views"
        description="This will make all shared views independent. The last view in each group will remain as-is."
        confirmLabel="Detach all"
        onCancel={() => setPendingDetachAll(false)}
        onConfirm={handleDetachAll}
      />
    </div>
  );
}
