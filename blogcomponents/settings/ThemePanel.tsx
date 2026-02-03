"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/blogcomponents/ui/ToastProvider";

export interface ThemeConfig {
  active_theme_id: number | null;
  color_scheme: "system" | "light" | "dark";
}

export interface CustomTheme {
  theme_id: number;
  name: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
    border: string;
  };
}

const defaultThemeConfig: ThemeConfig = {
  active_theme_id: null,
  color_scheme: "system"
};

const defaultColors = {
  background: "#ffffff",
  foreground: "#0f172a",
  primary: "#1f3b56",
  secondary: "#64748b",
  accent: "#3b82f6",
  muted: "#f1f5f9",
  border: "#e2e8f0"
};

export function ThemePanel() {
  const [config, setConfig] = useState<ThemeConfig>(defaultThemeConfig);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [newThemeName, setNewThemeName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const toast = useToast();
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthor) return;
    try {
      const [themeConfig, themes] = await Promise.all([
        apiFetch<ThemeConfig>("/themes/config"),
        apiFetch<CustomTheme[]>("/themes/custom")
      ]);
      setConfig({ ...defaultThemeConfig, ...themeConfig });
      setCustomThemes(themes || []);
    } catch {
      setConfig(defaultThemeConfig);
      setCustomThemes([]);
    } finally {
      hasLoadedRef.current = true;
    }
  }, [isAuthor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveConfig = useCallback(
    async (newConfig: ThemeConfig) => {
      if (!isAuthor) return;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      setSaveStatus("saving");
      saveTimerRef.current = window.setTimeout(async () => {
        try {
          await apiFetch("/themes/config", {
            method: "PUT",
            body: JSON.stringify(newConfig)
          });
          setSaveStatus("saved");
          setError(null);
          window.setTimeout(() => setSaveStatus("idle"), 1500);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save theme config");
          setSaveStatus("error");
          toast.push("Save failed", "error");
        } finally {
          saveTimerRef.current = null;
        }
      }, 500);
    },
    [isAuthor, toast]
  );

  const handleColorSchemeChange = (scheme: ThemeConfig["color_scheme"]) => {
    const newConfig = { ...config, color_scheme: scheme };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleActiveThemeChange = (themeId: number | null) => {
    const newConfig = { ...config, active_theme_id: themeId };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const createTheme = async () => {
    if (!isAuthor || !newThemeName.trim()) return;
    setIsCreating(true);
    try {
      const newTheme = await apiFetch<CustomTheme>("/themes/custom", {
        method: "POST",
        body: JSON.stringify({
          name: newThemeName.trim(),
          colors: defaultColors
        })
      });
      setCustomThemes((prev) => [...prev, newTheme]);
      setNewThemeName("");
      toast.push("Theme created", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create theme");
      toast.push("Create failed", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteTheme = async (themeId: number) => {
    if (!isAuthor) return;
    try {
      await apiFetch(`/themes/custom/${themeId}`, { method: "DELETE" });
      setCustomThemes((prev) => prev.filter((t) => t.theme_id !== themeId));
      if (config.active_theme_id === themeId) {
        handleActiveThemeChange(null);
      }
      toast.push("Theme deleted", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete theme");
      toast.push("Delete failed", "error");
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Theme</h2>
        <p>Customize the appearance of your site.</p>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h4>Color Scheme</h4>
          <p>Choose how colors adapt to system preferences.</p>
        </div>
        <div className="form-grid">
          <label>
            <span>Color Scheme</span>
            <select
              value={config.color_scheme}
              onChange={(e) =>
                handleColorSchemeChange(e.target.value as ThemeConfig["color_scheme"])
              }
            >
              <option value="system">System (auto)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <span className="form-hint">
              System will match your device&apos;s light/dark mode setting.
            </span>
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h4>Active Theme</h4>
          <p>Select a custom theme or use the default.</p>
        </div>
        <div className="form-grid">
          <label>
            <span>Theme</span>
            <select
              value={config.active_theme_id ?? ""}
              onChange={(e) =>
                handleActiveThemeChange(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Default Theme</option>
              {customThemes.map((theme) => (
                <option key={theme.theme_id} value={theme.theme_id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h4>Custom Themes</h4>
          <p>Create and manage custom themes.</p>
        </div>

        <div className="form-grid">
          <div className="inline-form">
            <input
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="New theme name"
            />
            <button
              className="button primary"
              onClick={createTheme}
              disabled={!newThemeName.trim() || isCreating}
              type="button"
            >
              {isCreating ? "Creating..." : "Create Theme"}
            </button>
          </div>
        </div>

        {customThemes.length > 0 ? (
          <ul className="item-list">
            {customThemes.map((theme) => (
              <li key={theme.theme_id} className="item-row">
                <span className="item-name">{theme.name}</span>
                <div className="item-actions">
                  <button
                    className="button small danger"
                    onClick={() => deleteTheme(theme.theme_id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No custom themes yet.</p>
        )}
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {saveStatus !== "idle" ? (
        <div className="action-bar">
          <div className="action-group action-group--right">
            {saveStatus === "saving" ? (
              <span className="status-chip status-saving">Saving...</span>
            ) : saveStatus === "error" ? (
              <span className="status-chip status-error">Save failed</span>
            ) : saveStatus === "saved" ? (
              <span className="status-chip status-saved">Saved</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
