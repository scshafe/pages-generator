"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useContainerFocus } from "@/blogcomponents/author/ContainerFocusProvider";
import { ComponentEditor } from "@/blogcomponents/author/ComponentEditor";
import { Switch } from "@/blogcomponents/ui/Switch";
import { InfoIcon } from "@/blogcomponents/ui/icons";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import type { ResolvedNode } from "@/lib/content/types";
import type { TerminologyMap } from "@/lib/content/terminology.types";

function normalizeTerms(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
    .filter((item) => item.length > 0);
}

export function ConfigurationPanel() {
  const { focusedNodeId } = useContainerFocus();
  const router = useRouter();
  const toast = useToast();
  const [resolved, setResolved] = useState<ResolvedNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceUseAI, setReferenceUseAI] = useState(false);
  const [isSavingReference, setIsSavingReference] = useState(false);
  const [terminology, setTerminology] = useState<TerminologyMap>({});
  const [activeVocabTerms, setActiveVocabTerms] = useState<string[]>([]);
  const [isSavingVocabTerms, setIsSavingVocabTerms] = useState(false);
  const [vocabError, setVocabError] = useState<string | null>(null);
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
    if (!resolved?.reference?.ref_id) {
      setReferenceUseAI(false);
      return;
    }
    setReferenceUseAI(Boolean((resolved.reference as { useAI?: boolean }).useAI));
  }, [resolved?.reference?.ref_id, resolved?.reference?.useAI]);

  const isViewContainer = resolved?.component?.type === "Container";

  useEffect(() => {
    if (!isViewContainer) {
      setTerminology({});
      setVocabError(null);
      return;
    }
    let isActive = true;
    apiFetch<TerminologyMap>("/terminology")
      .then((data) => {
        if (!isActive) return;
        setTerminology(data ?? {});
        setVocabError(null);
      })
      .catch((err) => {
        if (!isActive) return;
        setTerminology({});
        setVocabError(err instanceof Error ? err.message : "Failed to load terminology");
      });
    return () => {
      isActive = false;
    };
  }, [isViewContainer]);

  useEffect(() => {
    if (!isViewContainer) {
      setActiveVocabTerms([]);
      return;
    }
    setActiveVocabTerms(normalizeTerms((resolved?.config as { active_vocab_terms?: unknown })?.active_vocab_terms));
  }, [isViewContainer, resolved?.config]);

  const vocabTermList = useMemo(
    () => Object.keys(terminology).sort((a, b) => a.localeCompare(b)),
    [terminology]
  );

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

  const handleVocabToggle = useCallback(
    async (term: string, checked: boolean) => {
      if (!resolved?.reference?.ref_id) return;
      const previous = activeVocabTerms;
      const nextTerms = checked
        ? Array.from(new Set([...activeVocabTerms, term]))
        : activeVocabTerms.filter((item) => item !== term);
      setActiveVocabTerms(nextTerms);
      setIsSavingVocabTerms(true);
      setVocabError(null);
      try {
        await apiFetch(`/references/${resolved.reference.ref_id}`, {
          method: "PUT",
          body: JSON.stringify({ overrides: { active_vocab_terms: nextTerms } })
        });
        router.refresh();
      } catch (err) {
        setActiveVocabTerms(previous);
        const message = err instanceof Error ? err.message : "Failed to update vocab terms";
        setVocabError(message);
        toast.push(message, "error");
      } finally {
        setIsSavingVocabTerms(false);
      }
    },
    [activeVocabTerms, resolved?.reference?.ref_id, router, toast]
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
        if (resolved.component.type === "DividerUnit") {
          return "Divider";
        }
        if (resolved.component.type === "LinkUnit" || resolved.component.type === "ButtonUnit") {
          return config.label || null;
        }
        return null;
      })()
    : null;

  return (
    <div className="configuration-panel" role="region" aria-label="Configuration">
      <div className="configuration-header">
        <div className="configuration-title">
          <strong>Configuration</strong>
          <span className="muted">{typeLabel ?? (focusedNodeId ? "Loading..." : "No selection")}</span>
        </div>
        <div className="config-toggle-group">
          <span
            className="config-tooltip"
            role="tooltip"
            aria-label="Click text to edit, use shortcuts to add components, use group marker to add text"
          >
            <InfoIcon size={16} strokeWidth={2} aria-hidden />
            <span className="config-tooltip-text">
              Click text to edit. Use shortcuts to add components. Use the group marker to add new text. Press Enter in text to add a divider and a new text unit.
            </span>
          </span>
        </div>
      </div>
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
            <p className="muted">AI can move, hide, or adjust this reference when composing the page.</p>
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
      {resolved && !isLoading && isViewContainer ? (
        <div className="config-section">
          <div className="config-section-header">
            <strong>Active Vocab Terms</strong>
            <span className="muted">Highlight terms in this view</span>
          </div>
          {vocabError ? <div className="alert">{vocabError}</div> : null}
          {vocabTermList.length === 0 ? (
            <p className="muted">No terminology entries yet. Add terms in Settings &gt; Terminology.</p>
          ) : (
            <div className="config-section-list">
              {vocabTermList.map((term: string) => (
                <div key={term} className="toggle-row">
                  <span>{term}</span>
                  <Switch
                    checked={activeVocabTerms.includes(term)}
                    onCheckedChange={(checked) => handleVocabToggle(term, checked)}
                    disabled={isSavingVocabTerms}
                    aria-label={`Toggle vocab term ${term}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {!resolved && !isLoading && !error ? (
        <div className="muted">Focus a component to edit its configuration.</div>
      ) : null}
    </div>
  );
}
