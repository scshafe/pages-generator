"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import { AddIcon } from "@/blogcomponents/ui/icons";
import { ObjectActionDropdown } from "@/blogcomponents/ui/ObjectActionDropdown";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TerminologyMap } from "@/lib/content/terminology.types";

type TermDraft = {
  id: string;
  term: string;
  definitions: string[];
  examples: string[];
};

type EntryType = "definition" | "example";

type EditingEntry = {
  termId: string;
  type: EntryType;
  index: number;
  value: string;
  isNew: boolean;
};

type EditingTerm = {
  termId: string;
  value: string;
};

function mapToDrafts(map: TerminologyMap): TermDraft[] {
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([term, entry]) => ({
      id: `${term}-${Math.random().toString(16).slice(2)}`,
      term,
      definitions: Array.isArray(entry.Definitions)
        ? entry.Definitions.map((item) => String(item)).filter((item) => item.trim().length > 0)
        : [],
      examples: Array.isArray(entry.Examples)
        ? entry.Examples.map((item) => String(item)).filter((item) => item.trim().length > 0)
        : []
    }));
}

function draftsToMap(drafts: TermDraft[]) {
  const result: TerminologyMap = {};
  for (const draft of drafts) {
    const term = draft.term.trim();
    if (!term) continue;
    result[term] = {
      Definitions: draft.definitions.map((item) => item.trim()).filter(Boolean),
      Examples: draft.examples.map((item) => item.trim()).filter(Boolean)
    };
  }
  return result;
}

export function TerminologyPanel() {
  const toast = useToast();
  const [drafts, setDrafts] = useState<TermDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [editingTerm, setEditingTerm] = useState<EditingTerm | null>(null);

  const loadTerms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<TerminologyMap>("/terminology");
      const nextDrafts = mapToDrafts(data ?? {});
      setDrafts(nextDrafts);
      setLastSavedSnapshot(JSON.stringify(nextDrafts));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load terminology");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(drafts) !== lastSavedSnapshot;
  }, [drafts, lastSavedSnapshot]);

  const filteredDrafts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return drafts;
    return drafts.filter((draft) => {
      if (draft.term.toLowerCase().includes(query)) return true;
      if (draft.definitions.some((item) => item.toLowerCase().includes(query))) return true;
      if (draft.examples.some((item) => item.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [drafts, searchQuery]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    const payload = draftsToMap(drafts);
    try {
      await apiFetch<TerminologyMap>("/terminology", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setLastSavedSnapshot(JSON.stringify(drafts));
      toast.push("Terminology saved", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save terminology";
      setError(message);
      toast.push(message, "error");
    } finally {
      setIsSaving(false);
    }
  }, [drafts, toast]);

  const addTerm = useCallback(() => {
    setDrafts((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, term: "", definitions: [], examples: [] }
    ]);
  }, []);

  const updateDraft = useCallback((id: string, updates: Partial<TermDraft>) => {
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...updates } : draft)));
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  }, []);

  const updateTerm = useCallback((termId: string, value: string) => {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === termId ? { ...draft, term: value } : draft))
    );
  }, []);

  const updateEntry = useCallback((termId: string, type: EntryType, index: number, value: string) => {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.id !== termId) return draft;
        if (type === "definition") {
          const next = [...draft.definitions];
          next[index] = value;
          return { ...draft, definitions: next };
        }
        const next = [...draft.examples];
        next[index] = value;
        return { ...draft, examples: next };
      })
    );
  }, []);

  const removeEntry = useCallback((termId: string, type: EntryType, index: number) => {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.id !== termId) return draft;
        if (type === "definition") {
          const next = draft.definitions.filter((_, idx) => idx !== index);
          return { ...draft, definitions: next };
        }
        const next = draft.examples.filter((_, idx) => idx !== index);
        return { ...draft, examples: next };
      })
    );
  }, []);

  const startEditEntry = useCallback(
    (termId: string, type: EntryType, index: number, value: string, isNew = false) => {
      setEditingEntry({ termId, type, index, value, isNew });
    },
    []
  );

  const commitEditing = useCallback(() => {
    if (!editingEntry) return;
    const trimmed = editingEntry.value.trim();
    if (!trimmed) {
      removeEntry(editingEntry.termId, editingEntry.type, editingEntry.index);
    } else {
      updateEntry(editingEntry.termId, editingEntry.type, editingEntry.index, trimmed);
    }
    setEditingEntry(null);
  }, [editingEntry, removeEntry, updateEntry]);

  const cancelEditing = useCallback(() => {
    if (!editingEntry) return;
    if (editingEntry.isNew) {
      removeEntry(editingEntry.termId, editingEntry.type, editingEntry.index);
    }
    setEditingEntry(null);
  }, [editingEntry, removeEntry]);

  const addEntry = useCallback(
    (termId: string, type: EntryType) => {
      let nextIndex = 0;
      setDrafts((prev) =>
        prev.map((draft) => {
          if (draft.id !== termId) return draft;
          if (type === "definition") {
            nextIndex = draft.definitions.length;
            return { ...draft, definitions: [...draft.definitions, ""] };
          }
          nextIndex = draft.examples.length;
          return { ...draft, examples: [...draft.examples, ""] };
        })
      );
      startEditEntry(termId, type, nextIndex, "", true);
    },
    [startEditEntry]
  );

  const startEditTerm = useCallback((termId: string, value: string) => {
    setEditingTerm({ termId, value });
  }, []);

  const commitTermEditing = useCallback(() => {
    if (!editingTerm) return;
    const trimmed = editingTerm.value.trim();
    updateTerm(editingTerm.termId, trimmed || "VocabTerm");
    setEditingTerm(null);
  }, [editingTerm, updateTerm]);

  const cancelTermEditing = useCallback(() => {
    if (!editingTerm) return;
    const current = drafts.find((draft) => draft.id === editingTerm.termId);
    if (current) {
      updateTerm(editingTerm.termId, current.term);
    }
    setEditingTerm(null);
  }, [drafts, editingTerm, updateTerm]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Terminology</h2>
        <p>Create vocabulary terms with definitions and examples.</p>
      </div>
      <div className="section-card">
        {error ? <div className="alert">{error}</div> : null}
        {isLoading ? <p className="muted">Loading terminology...</p> : null}
        {!isLoading && drafts.length === 0 ? (
          <p className="muted">No terms yet. Add your first term below.</p>
        ) : null}
        <div className="terminology-toolbar">
          <label className="terminology-search">
            <span className="sr-only">Search</span>
            <input
              value={searchQuery}
              placeholder="Search terms, definitions, or examples"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <button className="terminology-add" type="button" onClick={addTerm} aria-label="Add term">
            <AddIcon size={16} />
          </button>
        </div>
        <div className="terminology-list">
          <Table className="terminology-table">
            <TableHeader>
              <TableRow>
                <TableHead className="terminology-table__head terminology-table__head--term">
                  Term
                </TableHead>
                <TableHead className="terminology-table__head">
                  <span className="terminology-table__head-label">
                    <span className="terminology-head-definition">Definitions</span>
                    <span className="terminology-head-divider">/</span>
                    <span className="terminology-head-example">Examples</span>
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrafts.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <span className="muted">No matches.</span>
                  </TableCell>
                </TableRow>
              ) : null}
              {filteredDrafts.map((draft) => {
                const activeEditing = editingEntry?.termId === draft.id ? editingEntry : null;
                const activeTermEditing = editingTerm?.termId === draft.id ? editingTerm : null;
                const entries: Array<{ type: EntryType; value: string; index: number }> = [];
                draft.definitions.forEach((value, index) => {
                  if (!value && !(activeEditing?.type === "definition" && activeEditing.index === index)) {
                    return;
                  }
                  entries.push({ type: "definition", value, index });
                });
                draft.examples.forEach((value, index) => {
                  if (!value && !(activeEditing?.type === "example" && activeEditing.index === index)) {
                    return;
                  }
                  entries.push({ type: "example", value, index });
                });

                return (
                  <TableRow key={draft.id} className="terminology-row">
                    <TableCell className="terminology-table__term">
                      <div className="terminology-term">
                        {activeTermEditing ? (
                          <input
                            className="terminology-term__input"
                            value={activeTermEditing.value}
                            placeholder="VocabTerm"
                            onChange={(event) =>
                              setEditingTerm((prev) => (prev ? { ...prev, value: event.target.value } : prev))
                            }
                            onBlur={commitTermEditing}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commitTermEditing();
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelTermEditing();
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="terminology-term__text">{draft.term || "VocabTerm"}</span>
                        )}
                        <div className="terminology-term__actions">
                          <ObjectActionDropdown
                            onEdit={() => startEditTerm(draft.id, draft.term)}
                            onDelete={() => removeDraft(draft.id)}
                            actions={[
                              {
                                label: "Add definition",
                                onSelect: () => addEntry(draft.id, "definition"),
                                icon: <AddIcon size={14} aria-hidden />
                              },
                              {
                                label: "Add example",
                                onSelect: () => addEntry(draft.id, "example"),
                                icon: <AddIcon size={14} aria-hidden />
                              }
                            ]}
                            triggerLabel="Term actions"
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="terminology-table__entries">
                      <div className="terminology-item__entries">
                        {entries.length === 0 ? (
                          <p className="muted">No definitions or examples yet.</p>
                        ) : null}
                        {entries.map((entry) => {
                          const isEditing =
                            activeEditing?.type === entry.type && activeEditing.index === entry.index;
                          return (
                            <div
                              key={`${entry.type}-${entry.index}`}
                              className={`terminology-entry terminology-entry--${entry.type}`}
                            >
                              {isEditing ? (
                                <input
                                  className="terminology-entry__input"
                                  value={activeEditing?.value ?? ""}
                                  onChange={(event) =>
                                    setEditingEntry((prev) =>
                                      prev ? { ...prev, value: event.target.value } : prev
                                    )
                                  }
                                  onBlur={commitEditing}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      commitEditing();
                                    }
                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      cancelEditing();
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span className="terminology-entry__text">{entry.value}</span>
                              )}
                              <div className="terminology-entry__actions">
                                <ObjectActionDropdown
                                  onEdit={() =>
                                    startEditEntry(draft.id, entry.type, entry.index, entry.value)
                                  }
                                  onDelete={() => removeEntry(draft.id, entry.type, entry.index)}
                                  triggerLabel={`${entry.type} actions`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="terminology-actions">
          <button className="button" type="button" onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? "Saving" : "Save terminology"}
          </button>
        </div>
      </div>
    </div>
  );
}
