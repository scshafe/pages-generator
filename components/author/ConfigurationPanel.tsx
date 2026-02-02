"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useContainerFocus } from "@/components/author/ContainerFocusProvider";
import { ComponentEditor } from "@/components/author/ComponentEditor";
import { Switch } from "@/components/ui/Switch";
import { InfoIcon } from "@/components/ui/icons";
import type { ResolvedNode } from "@/lib/content/types";

export function ConfigurationPanel() {
  const { focusedNodeId } = useContainerFocus();
  const [resolved, setResolved] = useState<ResolvedNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(true);
  const [referenceUseAI, setReferenceUseAI] = useState(false);
  const [isSavingReference, setIsSavingReference] = useState(false);
  const expandOnTypes = useMemo(() => new Set<string>([]), []);
  const typeLabel = resolved?.component.type ?? null;

  useEffect(() => {
    if (!focusedNodeId) {
      setResolved(null);
      setError(null);
      return;
    }
    let isActive = true;
    setIsLoading(true);
    setError(null);
    apiFetch<ResolvedNode>(`/nodes/${focusedNodeId}/resolved`)
      .then((data) => {
        if (!isActive) return;
        setResolved(data);
      })
      .catch((err) => {
        if (!isActive) return;
        setResolved(null);
        setError(err instanceof Error ? err.message : "Failed to load configuration");
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [focusedNodeId]);

  useEffect(() => {
    if (!resolved?.component?.type) return;
    if (expandOnTypes.has(resolved.component.type)) {
      setIsCompact(false);
    }
  }, [expandOnTypes, resolved?.component?.type]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable='true']")) {
        return;
      }
      const isHyper = event.metaKey && event.ctrlKey && event.altKey && event.shiftKey;
      if (!isHyper) return;
      if (event.key.toLowerCase() !== "t") return;
      event.preventDefault();
      setIsCompact((prev) => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!resolved?.reference?.ref_id) {
      setReferenceUseAI(false);
      return;
    }
    setReferenceUseAI(Boolean((resolved.reference as { useAI?: boolean }).useAI));
  }, [resolved?.reference?.ref_id, resolved?.reference?.useAI]);

  const handleReferenceToggle = useCallback(
    async (checked: boolean) => {
      if (!resolved?.reference?.ref_id) return;
      const nextValue = checked;
      const previous = referenceUseAI;
      setReferenceUseAI(nextValue);
      setIsSavingReference(true);
      try {
        await apiFetch(`/references/${resolved.reference.ref_id}`, {
          method: "PUT",
          body: JSON.stringify({ useAI: nextValue })
        });
      } catch {
        setReferenceUseAI(previous);
      } finally {
        setIsSavingReference(false);
      }
    },
    [referenceUseAI, resolved?.reference?.ref_id]
  );

  const referenceCount = resolved?.component.reference_count ?? 1;
  const showReferenceView = referenceCount > 1;
  const displayName = resolved
    ? (() => {
        const config = resolved.config as {
          name?: string;
          title?: string;
          text?: string;
          label?: string;
        };
        if (config.name || config.title) {
          return config.name || config.title || null;
        }
        if (resolved.component.type === "PlainTextUnit") {
          return config.text || null;
        }
        if (resolved.component.type === "DividorUnit") {
          return "Dividor";
        }
        if (resolved.component.type === "LinkUnit" || resolved.component.type === "ButtonUnit") {
          return config.label || null;
        }
        return null;
      })()
    : null;

  return (
    <div
      className={`configuration-panel${isCompact ? " is-compact" : ""}`}
      role="region"
      aria-label="Configuration"
    >
      <div className="configuration-header">
        <div className="configuration-title">
          {isCompact ? (
            <>
              <strong>{typeLabel ?? (focusedNodeId ? "Loading..." : "No selection")}</strong>
              {displayName ? <span className="muted">{displayName}</span> : null}
            </>
          ) : (
            <>
              <strong>Configuration</strong>
              <span className="muted">
                {typeLabel ?? (focusedNodeId ? "Loading..." : "No selection")}
              </span>
            </>
          )}
        </div>
        <div className="config-toggle-group">
          <button
            className="button ghost"
            type="button"
            onClick={() => setIsCompact((prev) => !prev)}
            aria-label={isCompact ? "Expand configuration" : "Compact configuration"}
          >
            {isCompact ? "Expand" : "Compact"}
          </button>
          <span
            className="config-tooltip"
            role="tooltip"
            aria-label="Click text to edit, use shortcuts to add components, use group marker to add text"
          >
            <InfoIcon size={16} strokeWidth={2} aria-hidden />
            <span className="config-tooltip-text">
              Click text to edit. Use shortcuts to add components. Use the group marker to add new text. Press Enter in text to add a dividor and a new text unit.
            </span>
          </span>
        </div>
      </div>
      {isCompact ? null : (
        <>
          {error ? <div className="alert">{error}</div> : null}
          {isLoading ? <div className="muted">Loading configuration...</div> : null}
          {resolved && !isLoading && showReferenceView ? (
            <div className="config-section">
              <div className="config-section-header">
                <strong>Reference</strong>
                <span className="muted">Instance settings</span>
              </div>
              <div className="toggle-row">
                <span>Use AI</span>
                <Switch
                  checked={referenceUseAI}
                  onCheckedChange={handleReferenceToggle}
                  disabled={isSavingReference}
                  aria-label="Use AI on reference"
                />
              </div>
              {referenceUseAI ? (
                <p className="muted">
                  AI can move, hide, or adjust this reference when composing the page.
                </p>
              ) : null}
            </div>
          ) : null}
          {resolved && !isLoading ? (
            <div className="config-section">
              <div className="config-section-header">
                <strong>Original</strong>
                <span className="muted">Component settings</span>
              </div>
              <ComponentEditor
                key={`component-${resolved.node.node_id}-${resolved.component.updated_at ?? "latest"}`}
                nodeId={resolved.node.node_id}
                compId={resolved.component.comp_id}
                componentType={resolved.component.type}
                config={resolved.config}
              />
            </div>
          ) : null}
          {!resolved && !isLoading && !error ? (
            <div className="muted">Focus a component to edit its configuration.</div>
          ) : null}
        </>
      )}
    </div>
  );
}
