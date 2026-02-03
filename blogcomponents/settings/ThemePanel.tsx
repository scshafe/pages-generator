"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { customColorTypes, defaultCustomColor } from "@/lib/content/customColors";
import type { CustomColorType } from "@/lib/content/customColors";
import type { CustomColorMap, CustomComponentItem, ViewSummary } from "@/lib/content/types";

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
  custom_colors?: CustomColorMap;
}

const defaultThemeConfig: ThemeConfig = {
  active_theme_id: null,
  color_scheme: "system"
};

const buildDefaultCustomColors = (): CustomColorMap => {
  const result: CustomColorMap = {};
  customColorTypes.forEach((entry) => {
    result[entry.value] = { [entry.value]: { ...defaultCustomColor } };
  });
  return result;
};

const normalizeCustomColors = (value?: CustomColorMap | null): CustomColorMap => {
  const defaults = buildDefaultCustomColors();
  if (!value || typeof value !== "object") return defaults;
  const normalized: CustomColorMap = {};
  customColorTypes.forEach((entry) => {
    const rawType = (value as CustomColorMap)[entry.value];
    const nextType: Record<string, typeof defaultCustomColor> = {};
    if (rawType && typeof rawType === "object") {
      Object.entries(rawType).forEach(([name, colors]) => {
        if (colors && typeof colors === "object") {
          nextType[name] = { ...defaultCustomColor, ...(colors as typeof defaultCustomColor) };
        }
      });
    }
    if (!nextType[entry.value]) {
      nextType[entry.value] = { ...defaultCustomColor };
    }
    normalized[entry.value] = nextType;
  });
  return normalized;
};

export function ThemePanel() {
  const [config, setConfig] = useState<ThemeConfig>(defaultThemeConfig);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [customComponents, setCustomComponents] = useState<CustomComponentItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [detailStatus, setDetailStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null);
  const [activeCustomType, setActiveCustomType] = useState<CustomColorType>("general");
  const toast = useToast();
  const router = useRouter();
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const detailTimerRef = useRef<number | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthor) return;
      try {
        const [themeConfig, themes, components] = await Promise.all([
          apiFetch<ThemeConfig>("/themes/config"),
          apiFetch<CustomTheme[]>("/themes/custom"),
          apiFetch<CustomComponentItem[]>("/custom-components")
        ]);
        setConfig({ ...defaultThemeConfig, ...themeConfig });
        setCustomThemes(themes || []);
        setCustomComponents(components || []);
      } catch {
        setConfig(defaultThemeConfig);
        setCustomThemes([]);
        setCustomComponents([]);
      } finally {
        hasLoadedRef.current = true;
      }
  }, [isAuthor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedTheme = useMemo(
    () => customThemes.find((theme) => theme.theme_id === selectedThemeId) ?? null,
    [customThemes, selectedThemeId]
  );

  const normalizedCustomColors = useMemo(
    () => normalizeCustomColors(selectedTheme?.custom_colors),
    [selectedTheme]
  );

  const componentsByType = useMemo(() => {
    const map: Record<string, CustomComponentItem[]> = {};
    customColorTypes.forEach((entry) => {
      map[entry.value] = [];
    });
    if (!selectedThemeId) return map;
    customComponents.forEach((component) => {
      if (component.theme_id !== selectedThemeId) return;
      if (!map[component.component_type]) {
        map[component.component_type] = [];
      }
      map[component.component_type].push(component);
    });
    Object.keys(map).forEach((key) => {
      map[key] = map[key].sort((a, b) => a.name.localeCompare(b.name));
    });
    return map;
  }, [customComponents, selectedThemeId]);

  useEffect(() => {
    if (selectedThemeId && !selectedTheme) {
      setSelectedThemeId(null);
    }
  }, [selectedTheme, selectedThemeId]);

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

  const handleThemeSelect = useCallback((themeId: number) => {
    setSelectedThemeId(themeId);
    setActiveCustomType("general");
    setDetailError(null);
    setDetailStatus("idle");
  }, []);

  const saveCustomColors = useCallback(
    async (themeId: number, nextColors: CustomColorMap) => {
      if (!isAuthor) return;
      if (detailTimerRef.current) {
        window.clearTimeout(detailTimerRef.current);
        detailTimerRef.current = null;
      }
      setDetailStatus("saving");
      try {
        const updated = await apiFetch<CustomTheme>(`/themes/${themeId}`, {
          method: "PUT",
          body: JSON.stringify({ custom_colors: nextColors })
        });
        setCustomThemes((prev) =>
          prev.map((theme) => (theme.theme_id === themeId ? { ...theme, ...updated } : theme))
        );
        setDetailError(null);
        setDetailStatus("saved");
        detailTimerRef.current = window.setTimeout(() => {
          setDetailStatus("idle");
          detailTimerRef.current = null;
        }, 1500);
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : "Failed to save custom colors");
        setDetailStatus("error");
        toast.push("Save failed", "error");
      }
    },
    [isAuthor, toast]
  );

  const handleToggleCustomComponent = useCallback(
    (type: CustomColorType, name: string) => {
      if (!selectedTheme) return;
      if (name === type) return;
      const nextColors = normalizeCustomColors(selectedTheme.custom_colors);
      const typeMap = { ...(nextColors[type] ?? {}) };
      if (typeMap[name]) {
        delete typeMap[name];
      } else {
        const base = typeMap[type] ?? { ...defaultCustomColor };
        typeMap[name] = { ...base };
      }
      nextColors[type] = typeMap;
      saveCustomColors(selectedTheme.theme_id, nextColors);
    },
    [saveCustomColors, selectedTheme]
  );

  const navigateToPublishExample = useCallback(async () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      const views = await apiFetch<ViewSummary[]>("/views");
      const match = views.find((view) => {
        const config = view.config ?? {};
        return (
          config.name === "PublishViewExample" ||
          config.title === "PublishViewExample" ||
          config.path === "/PublishViewExample" ||
          config.path === "/publish-view-example"
        );
      });
      const path = match?.config.path ?? "/PublishViewExample";
      router.push(path);
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to open PublishViewExample", "error");
      router.push("/PublishViewExample");
    } finally {
      setIsNavigating(false);
    }
  }, [isNavigating, router, toast]);

  const deleteTheme = async (themeId: number) => {
    if (!isAuthor) return;
    try {
      await apiFetch(`/themes/custom/${themeId}`, { method: "DELETE" });
      setCustomThemes((prev) => prev.filter((t) => t.theme_id !== themeId));
      if (config.active_theme_id === themeId) {
        handleActiveThemeChange(null);
      }
      if (selectedThemeId === themeId) {
        setSelectedThemeId(null);
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

      <div className="theme-split">
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
      </div>

      <div className="section-card">
        <div className="section-header">
          <h4>Themes</h4>
          <p>Create and manage custom themes.</p>
        </div>
        <div className="themes-toolbar">
          <button
            className="button add-button"
            type="button"
            onClick={navigateToPublishExample}
            aria-label="Create theme"
            disabled={isNavigating}
          >
            +
          </button>
        </div>
        <Table className="themes-table">
          <TableHeader>
            <TableRow>
              <TableHead>Theme</TableHead>
              <TableHead className="themes-table-actions">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customThemes.length > 0 ? (
              customThemes.map((theme) => (
                <TableRow
                  key={theme.theme_id}
                  className="themes-table-row"
                  data-state={selectedThemeId === theme.theme_id ? "selected" : undefined}
                >
                  <TableCell>
                    <button
                      className="theme-select-button"
                      type="button"
                      onClick={() => handleThemeSelect(theme.theme_id)}
                    >
                      {theme.name}
                    </button>
                  </TableCell>
                  <TableCell className="themes-table-actions">
                    <button
                      className="button small danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteTheme(theme.theme_id);
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="themes-table-empty">
                  <span className="muted">No custom themes yet.</span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedTheme ? (
        <div className="section-card theme-detail-card">
          <div className="section-header theme-detail-header">
            <div>
              <h4>{selectedTheme.name}</h4>
              <p>Choose which custom components are available in this theme.</p>
            </div>
            <div className="theme-detail-actions">
              {detailStatus !== "idle" ? (
                <span
                  className={`status-chip ${
                    detailStatus === "saving"
                      ? "status-saving"
                      : detailStatus === "error"
                        ? "status-error"
                        : "status-saved"
                  }`}
                >
                  {detailStatus === "saving"
                    ? "Saving..."
                    : detailStatus === "error"
                      ? "Save failed"
                      : "Saved"}
                </span>
              ) : null}
              <button className="button small ghost" type="button" onClick={() => setSelectedThemeId(null)}>
                Back
              </button>
            </div>
          </div>
          <Tabs
            value={activeCustomType}
            onValueChange={(value) => setActiveCustomType(value as CustomColorType)}
            className="theme-detail-tabs-wrapper"
          >
            <TabsList className="nav-subtabs theme-detail-tabs">
              {customColorTypes.map((entry) => (
                <TabsTrigger key={entry.value} value={entry.value} className="nav-subtab">
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {customColorTypes.map((entry) => {
              const typeComponents = componentsByType[entry.value] ?? [];
              const filteredComponents = typeComponents.filter(
                (component) => component.name !== entry.value
              );
              const selectedNames = new Set(Object.keys(normalizedCustomColors[entry.value] ?? {}));
              return (
                <TabsContent
                  key={entry.value}
                  value={entry.value}
                  className="theme-detail-tab-content"
                >
                  <div className="theme-custom-components">
                    <div className="theme-custom-components__list">
                      <div className="theme-custom-components__item theme-custom-components__item--default">
                        <input type="checkbox" checked disabled />
                        <span>{entry.label} default</span>
                      </div>
                      {filteredComponents.map((component) => {
                        const isSelected = selectedNames.has(component.name);
                        return (
                          <label
                            key={component.custom_component_id}
                            className={`theme-custom-components__item ${isSelected ? "is-selected" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCustomComponent(entry.value, component.name)}
                            />
                            <span>{component.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    {filteredComponents.length === 0 ? (
                      <p className="muted">No custom components for this type yet.</p>
                    ) : null}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
          {detailError ? <div className="alert">{detailError}</div> : null}
        </div>
      ) : null}

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
