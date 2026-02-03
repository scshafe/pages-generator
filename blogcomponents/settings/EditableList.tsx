"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/blogcomponents/ui/ToastProvider";

export function EditableList<T extends { id: number; label: string; href: string }>({
  title,
  items,
  onSave,
  onDelete,
  validate
}: {
  title: string;
  items: T[];
  onSave: (item: T) => Promise<void>;
  onDelete: (item: T) => Promise<void>;
  validate?: (item: T) => string | null;
}) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<number, { label: string; href: string }>>({});
  const [dirty, setDirty] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const nextDrafts: Record<number, { label: string; href: string }> = {};
    for (const item of items) {
      nextDrafts[item.id] = { label: item.label, href: item.href };
    }
    setDrafts(nextDrafts);
  }, [items]);

  async function persist(item: T) {
    if (saving[item.id]) return;
    if (validate) {
      const error = validate(item);
      if (error) {
        toast.push(error, "error");
        return;
      }
    }
    setSaving((prev) => ({ ...prev, [item.id]: true }));
    try {
      await onSave(item);
      setDirty((prev) => ({ ...prev, [item.id]: false }));
      setSaved((prev) => ({ ...prev, [item.id]: true }));
      toast.push("Saved", "success");
      setTimeout(() => {
        setSaved((prev) => ({ ...prev, [item.id]: false }));
      }, 1500);
    } catch {
      toast.push("Save failed", "error");
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  return (
    <div className="section-card">
      <h3>{title}</h3>
      <div className="list">
        {items.map((item) => {
          const draft = drafts[item.id] ?? { label: item.label, href: item.href };
          const validationError = validate
            ? validate({ ...item, label: draft.label, href: draft.href })
            : null;
          return (
            <div key={item.id} className="list-item column">
              <label>
                <span>Label</span>
                <input
                  value={draft.label}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDrafts((prev) => ({
                      ...prev,
                      [item.id]: { ...draft, label: value }
                    }));
                    setDirty((prev) => ({ ...prev, [item.id]: true }));
                  }}
                  onBlur={() => persist({ ...item, label: draft.label, href: draft.href })}
                  aria-invalid={Boolean(validationError)}
                />
              </label>
              <label>
                <span>Href</span>
                <input
                  value={draft.href}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDrafts((prev) => ({
                      ...prev,
                      [item.id]: { ...draft, href: value }
                    }));
                    setDirty((prev) => ({ ...prev, [item.id]: true }));
                  }}
                  onBlur={() => persist({ ...item, label: draft.label, href: draft.href })}
                  aria-invalid={Boolean(validationError)}
                />
                {validationError ? (
                  <span className="form-hint error">{validationError}</span>
                ) : null}
              </label>
              <div className="action-bar">
                <div className="action-group">
                  <button
                    className="button ghost small"
                    type="button"
                    onClick={() => persist({ ...item, label: draft.label, href: draft.href })}
                    disabled={saving[item.id]}
                  >
                    Save
                  </button>
                  {dirty[item.id] ? <span className="status-chip status-dirty">Unsaved</span> : null}
                  {saving[item.id] ? <span className="status-chip status-saving">Saving...</span> : null}
                  {saved[item.id] ? <span className="status-chip status-saved">Saved</span> : null}
                </div>
                <div className="action-group action-group--right">
                  <button className="button danger small" type="button" onClick={() => onDelete(item)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
