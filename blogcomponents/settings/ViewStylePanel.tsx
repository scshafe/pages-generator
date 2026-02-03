"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ViewStyleDefaults {
  default_max_width: string;
  default_padding: string;
  default_text_alignment: "left" | "center" | "right" | "justify";
  default_font_size: string;
  default_line_height: string;
  header_style: "standard" | "hero" | "minimal";
  content_style: "prose" | "cards" | "grid";
  spacing_unit: number;
}

const defaultViewStyles: ViewStyleDefaults = {
  default_max_width: "768px",
  default_padding: "1.5rem",
  default_text_alignment: "left",
  default_font_size: "1rem",
  default_line_height: "1.75",
  header_style: "standard",
  content_style: "prose",
  spacing_unit: 8
};

const voices = [{ id: "default", name: "Default Voice" }];

export function ViewStylePanel() {
  const [rawText, setRawText] = useState("");
  const [savedRaw, setSavedRaw] = useState("");
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const parsed = useMemo(() => {
    if (!rawText.trim()) return { value: null, error: null };
    try {
      const parsedValue = JSON.parse(rawText) as Partial<ViewStyleDefaults>;
      const next = { ...defaultViewStyles, ...parsedValue };
      return { value: next, error: null };
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : "Invalid JSON" };
    }
  }, [rawText]);

  const hasChanges = rawText.trim().length > 0 && rawText !== savedRaw;

  const loadSettings = useCallback(async () => {
    if (!isAuthor) return;
    try {
      const response = await apiFetch<ViewStyleDefaults>("/view-styles");
      const next = { ...defaultViewStyles, ...response };
      const nextRaw = JSON.stringify(next, null, 2);
      setRawText(nextRaw);
      setSavedRaw(nextRaw);
      setSaveStatus("idle");
    } catch {
      const nextRaw = JSON.stringify(defaultViewStyles, null, 2);
      setRawText(nextRaw);
      setSavedRaw(nextRaw);
    } finally {
      hasLoadedRef.current = true;
    }
  }, [isAuthor]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!isAuthor) return;
    if (!hasLoadedRef.current) return;
    if (!hasChanges) return;
    if (!parsed.value) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setSaveStatus("saving");
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const updated = await apiFetch<ViewStyleDefaults>("/view-styles", {
          method: "PUT",
          body: JSON.stringify(parsed.value)
        });
        const next = { ...defaultViewStyles, ...updated };
        const nextRaw = JSON.stringify(next, null, 2);
        setRawText(nextRaw);
        setSavedRaw(nextRaw);
        setSaveStatus("saved");
        setError(null);
        window.setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save voices");
        setSaveStatus("error");
        toast.push("Save failed", "error");
      } finally {
        saveTimerRef.current = null;
      }
    }, 700);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [hasChanges, isAuthor, parsed.value, rawText, toast]);

  return (
    <div className="panel voices-panel">
      {activeVoiceId ? (
        <div className="voices-editor">
          <div className="voices-editor__toolbar">
            <button className="button ghost small" type="button" onClick={() => setActiveVoiceId(null)}>
              Back
            </button>
          </div>
          <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} rows={18} />
          {parsed.error ? <span className="form-error">{parsed.error}</span> : null}
        </div>
      ) : (
        <div className="voices-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voices.map((voice) => (
                <TableRow
                  key={voice.id}
                  className="voices-table-row"
                  onClick={() => setActiveVoiceId(voice.id)}
                >
                  <TableCell>{voice.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {error ? <div className="alert">{error}</div> : null}
      {isAuthor && saveStatus === "saving" ? (
        <div className="action-bar">
          <div className="action-group action-group--right">
            <span className="status-chip status-saving">Saving...</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
