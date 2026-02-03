"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/blogcomponents/ui/ToastProvider";

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

const maxWidthOptions = [
  { value: "640px", label: "Small (640px)" },
  { value: "768px", label: "Medium (768px)" },
  { value: "1024px", label: "Large (1024px)" },
  { value: "1280px", label: "Extra Large (1280px)" },
  { value: "100%", label: "Full Width" }
];

const paddingOptions = [
  { value: "1rem", label: "Compact (1rem)" },
  { value: "1.5rem", label: "Standard (1.5rem)" },
  { value: "2rem", label: "Comfortable (2rem)" },
  { value: "3rem", label: "Spacious (3rem)" }
];

const fontSizeOptions = [
  { value: "0.875rem", label: "Small (14px)" },
  { value: "1rem", label: "Medium (16px)" },
  { value: "1.125rem", label: "Large (18px)" },
  { value: "1.25rem", label: "Extra Large (20px)" }
];

const lineHeightOptions = [
  { value: "1.5", label: "Tight (1.5)" },
  { value: "1.625", label: "Normal (1.625)" },
  { value: "1.75", label: "Relaxed (1.75)" },
  { value: "2", label: "Loose (2)" }
];

export function ViewStylePanel() {
  const [form, setForm] = useState<ViewStyleDefaults>(defaultViewStyles);
  const [savedSnapshot, setSavedSnapshot] = useState<ViewStyleDefaults>(defaultViewStyles);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const loadSettings = useCallback(async () => {
    if (!isAuthor) return;
    try {
      const response = await apiFetch<ViewStyleDefaults>("/view-styles");
      const next = { ...defaultViewStyles, ...response };
      setForm(next);
      setSavedSnapshot(next);
      setSaveStatus("idle");
    } catch {
      // Settings might not exist yet, use defaults
      setForm(defaultViewStyles);
      setSavedSnapshot(defaultViewStyles);
    } finally {
      hasLoadedRef.current = true;
    }
  }, [isAuthor]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const hasChanges = (() => {
    const keys = Object.keys(defaultViewStyles) as (keyof ViewStyleDefaults)[];
    return keys.some((key) => form[key] !== savedSnapshot[key]);
  })();

  useEffect(() => {
    if (!isAuthor) return;
    if (!hasLoadedRef.current) return;
    if (!hasChanges) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setSaveStatus("saving");
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const updated = await apiFetch<ViewStyleDefaults>("/view-styles", {
          method: "PUT",
          body: JSON.stringify(form)
        });
        const next = { ...defaultViewStyles, ...updated };
        setForm(next);
        setSavedSnapshot(next);
        setSaveStatus("saved");
        setError(null);
        window.setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save view styles");
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
  }, [form, hasChanges, isAuthor, toast]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>View Style Defaults</h2>
        <p>Set default styles that apply to all views unless overridden.</p>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h4>Layout Defaults</h4>
          <p>Control the default layout behavior for views.</p>
        </div>
        <div className="form-grid">
          <label>
            <span>Max Content Width</span>
            <select
              value={form.default_max_width}
              onChange={(e) => setForm((prev) => ({ ...prev, default_max_width: e.target.value }))}
            >
              {maxWidthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="form-hint">Maximum width for content containers.</span>
          </label>

          <label>
            <span>Content Padding</span>
            <select
              value={form.default_padding}
              onChange={(e) => setForm((prev) => ({ ...prev, default_padding: e.target.value }))}
            >
              {paddingOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="form-hint">Padding around content areas.</span>
          </label>

          <label>
            <span>Spacing Unit (px)</span>
            <input
              type="number"
              min={4}
              max={16}
              value={form.spacing_unit}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, spacing_unit: Number(e.target.value) }))
              }
            />
            <span className="form-hint">Base spacing unit for margins and gaps.</span>
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h4>Typography Defaults</h4>
          <p>Default text styling for view content.</p>
        </div>
        <div className="form-grid">
          <label>
            <span>Text Alignment</span>
            <select
              value={form.default_text_alignment}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  default_text_alignment: e.target.value as ViewStyleDefaults["default_text_alignment"]
                }))
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
          </label>

          <label>
            <span>Font Size</span>
            <select
              value={form.default_font_size}
              onChange={(e) => setForm((prev) => ({ ...prev, default_font_size: e.target.value }))}
            >
              {fontSizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Line Height</span>
            <select
              value={form.default_line_height}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, default_line_height: e.target.value }))
              }
            >
              {lineHeightOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h4>Style Presets</h4>
          <p>Quick style presets for common view types.</p>
        </div>
        <div className="form-grid">
          <label>
            <span>Header Style</span>
            <select
              value={form.header_style}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  header_style: e.target.value as ViewStyleDefaults["header_style"]
                }))
              }
            >
              <option value="standard">Standard</option>
              <option value="hero">Hero (large, centered)</option>
              <option value="minimal">Minimal</option>
            </select>
            <span className="form-hint">Default style for view headers.</span>
          </label>

          <label>
            <span>Content Style</span>
            <select
              value={form.content_style}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  content_style: e.target.value as ViewStyleDefaults["content_style"]
                }))
              }
            >
              <option value="prose">Prose (long-form text)</option>
              <option value="cards">Cards (block items)</option>
              <option value="grid">Grid (tiled layout)</option>
            </select>
            <span className="form-hint">Default layout style for view content.</span>
          </label>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {isAuthor && (hasChanges || saveStatus !== "idle") ? (
        <div className="action-bar">
          <div className="action-group action-group--right">
            {saveStatus === "saving" ? (
              <span className="status-chip status-saving">Saving...</span>
            ) : saveStatus === "error" ? (
              <span className="status-chip status-error">Save failed</span>
            ) : saveStatus === "saved" ? (
              <span className="status-chip status-saved">Saved</span>
            ) : hasChanges ? (
              <span className="status-chip status-dirty">Unsaved changes</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
