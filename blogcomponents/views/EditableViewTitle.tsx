"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/blogcomponents/ui/ToastProvider";

type ViewConfig = {
  path?: string;
  name?: string;
  title?: string;
  browser_title?: string;
  description?: string | null;
};

export function EditableViewTitle({
  nodeId,
  config,
  isAuthor
}: {
  nodeId: number;
  config: ViewConfig;
  isAuthor: boolean;
}) {
  const toast = useToast();
  const titleValue = String(config.title ?? config.name ?? "Untitled view");
  const [draft, setDraft] = useState(titleValue);
  const [isSaving, setIsSaving] = useState(false);
  const spanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setDraft(titleValue);
  }, [titleValue]);

  const saveTitle = async (nextValue: string) => {
    if (!nextValue.trim()) return;
    if (nextValue === titleValue) return;
    setIsSaving(true);
    try {
      await apiFetch(`/views/${nodeId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: nextValue,
          name: nextValue,
          browser_title: nextValue
        })
      });
    } catch {
      toast.push("Failed to update view title", "error");
      setDraft(titleValue);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthor) {
    return <h1>{titleValue}</h1>;
  }

  return (
    <h1 className={`view-title${isSaving ? " is-saving" : ""}`}>
      <span
        ref={spanRef}
        className="view-title-edit"
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => setDraft(event.currentTarget.textContent ?? "")}
        onBlur={(event) => saveTitle(event.currentTarget.textContent ?? "")}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            spanRef.current?.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(titleValue);
            spanRef.current?.blur();
          }
        }}
      >
        {draft}
      </span>
    </h1>
  );
}
