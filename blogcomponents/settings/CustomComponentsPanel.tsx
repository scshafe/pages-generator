"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import { ConfirmDialog } from "@/blogcomponents/ui/ConfirmDialog";
import { ObjectActionDropdown } from "@/blogcomponents/ui/ObjectActionDropdown";
import { CreationCard } from "@/blogcomponents/ui/CreationCard";
import type { CreationStage, CreationValueState } from "@/blogcomponents/ui/CreationCard";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { customColorTypes } from "@/lib/content/customColors";
import type { CustomColorType } from "@/lib/content/customColors";
import type { CustomComponentItem } from "@/lib/content/types";

type CustomThemeOption = {
  theme_id: number;
  name: string;
};

export function CustomComponentsPanel() {
  const [themes, setThemes] = useState<CustomThemeOption[]>([]);
  const [components, setComponents] = useState<CustomComponentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [selectedComponent, setSelectedComponent] = useState<CustomComponentItem | null>(null);
  const [createVersion, setCreateVersion] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<CustomComponentItem | null>(null);
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [themeData, componentData] = await Promise.all([
          apiFetch<CustomThemeOption[]>("/themes/custom"),
          apiFetch<CustomComponentItem[]>("/custom-components")
        ]);
        setThemes(themeData || []);
        setComponents(componentData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load custom components");
      }
    };
    load();
  }, []);

  const themeNameMap = useMemo(() => {
    return new Map(themes.map((theme) => [theme.theme_id, theme.name]));
  }, [themes]);

  const sortedComponents = useMemo(
    () => [...components].sort((a, b) => a.name.localeCompare(b.name)),
    [components]
  );

  const themeOptions = useMemo(
    () => themes.map((theme) => ({ label: theme.name, value: String(theme.theme_id) })),
    [themes]
  );

  const componentTypeOptions = useMemo(
    () => customColorTypes.map((entry) => ({ label: entry.label, value: entry.value })),
    []
  );

  const componentTypeLabelMap = useMemo(() => {
    return new Map(customColorTypes.map((entry) => [entry.value, entry.label]));
  }, []);

  const startCreate = useCallback(() => {
    setEditorMode("create");
    setSelectedComponent(null);
    setCreateVersion((prev) => prev + 1);
  }, []);

  const startEdit = useCallback((item: CustomComponentItem) => {
    setEditorMode("edit");
    setSelectedComponent(item);
  }, []);

  const handleCreate = useCallback(async (values: Record<string, CreationValueState>) => {
    const name = String(values.name ?? "").trim();
    const componentType = String(values.component_type ?? "").trim();
    const themeId = Number(values.theme_id ?? NaN);
    if (!name || !componentType || Number.isNaN(themeId)) return;
    try {
      const created = await apiFetch<CustomComponentItem>("/custom-components", {
        method: "POST",
        body: JSON.stringify({ name, component_type: componentType, theme_id: themeId })
      });
      setComponents((prev) => [created, ...prev]);
      toast.push("Custom component added", "success");
      setCreateVersion((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add custom component");
      toast.push("Failed to add custom component", "error");
    }
  }, [toast]);

  const handleEditSave = useCallback(async (values: Record<string, CreationValueState>) => {
    if (!selectedComponent) return;
    const name = String(values.name ?? "").trim();
    const componentType = String(values.component_type ?? "").trim();
    const themeId = Number(values.theme_id ?? NaN);
    if (!name || !componentType || Number.isNaN(themeId)) return;
    try {
      await apiFetch(`/custom-components/${selectedComponent.custom_component_id}`, {
        method: "PUT",
        body: JSON.stringify({ name, component_type: componentType, theme_id: themeId })
      });
      setComponents((prev) =>
        prev.map((item) =>
          item.custom_component_id === selectedComponent.custom_component_id
            ? { ...item, name, component_type: componentType, theme_id: themeId }
            : item
        )
      );
      setSelectedComponent((prev) =>
        prev ? { ...prev, name, component_type: componentType, theme_id: themeId } : prev
      );
      toast.push("Custom component saved", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to save custom component", "error");
    }
  }, [selectedComponent, toast]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await apiFetch(`/custom-components/${pendingDelete.custom_component_id}`, { method: "DELETE" });
      setComponents((prev) =>
        prev.filter((item) => item.custom_component_id !== pendingDelete.custom_component_id)
      );
      if (selectedComponent?.custom_component_id === pendingDelete.custom_component_id) {
        startCreate();
      }
      toast.push("Custom component deleted", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setPendingDelete(null);
    }
  }, [pendingDelete, selectedComponent, startCreate, toast]);

  const createStages = useMemo<CreationStage[]>(() => {
    return [
      {
        id: "create",
        values: [
          {
            id: "name",
            type: "text",
            defaultValue: "",
            validation: { required: true },
            config: { label: "Name", placeholder: "Component name" }
          },
          {
            id: "theme_id",
            type: "select",
            defaultValue: "",
            validation: { required: true },
            config: {
              label: "Theme",
              selectStyle: "enum",
              options: themeOptions
            }
          },
          {
            id: "component_type",
            type: "select",
            defaultValue: "",
            validation: { required: true },
            config: {
              label: "Component",
              selectStyle: "enum",
              options: componentTypeOptions
            }
          }
        ]
      }
    ];
  }, [componentTypeOptions, themeOptions]);

  const editStages = useMemo<CreationStage[]>(() => {
    return [
      {
        id: "edit",
        values: [
          {
            id: "name",
            type: "text",
            defaultValue: selectedComponent?.name ?? "",
            validation: { required: true },
            config: { label: "Name", placeholder: "Component name" }
          },
          {
            id: "theme_id",
            type: "select",
            defaultValue: selectedComponent ? String(selectedComponent.theme_id) : "",
            validation: { required: true },
            config: {
              label: "Theme",
              selectStyle: "enum",
              options: themeOptions
            }
          },
          {
            id: "component_type",
            type: "select",
            defaultValue: selectedComponent?.component_type ?? "",
            validation: { required: true },
            config: {
              label: "Component",
              selectStyle: "enum",
              options: componentTypeOptions
            }
          }
        ]
      }
    ];
  }, [componentTypeOptions, selectedComponent, themeOptions]);

  const renderEditor = () => {
    const isEditing = editorMode === "edit" && selectedComponent;
    const selectedKey = selectedComponent ? selectedComponent.custom_component_id : "new";
    const creationKey = `custom-component-create-${createVersion}`;
    const editKey = `custom-component-edit-${selectedKey}`;
    return (
      <div className="section-card nav-editor">
        {isEditing ? (
          <div className="nav-editor-actions">
            <button className="button small ghost" type="button" onClick={startCreate}>
              New
            </button>
          </div>
        ) : null}
        <CreationCard
          key={isEditing ? editKey : creationKey}
          title=""
          stages={isEditing ? editStages : createStages}
          onSave={isEditing ? handleEditSave : handleCreate}
          saveLabel="Save"
          saveStageAsCard={false}
        />
      </div>
    );
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>CustomComponents</h2>
        <p>Create theme-specific component variants.</p>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="nav-panel-grid">
        <div className="section-card nav-table-card">
          <Table className="nav-table">
            <TableBody>
              {sortedComponents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="nav-table-empty">
                    <span className="muted">No custom components yet.</span>
                  </TableCell>
                </TableRow>
              ) : (
                sortedComponents.map((item) => {
                  const isSelected = selectedComponent?.custom_component_id === item.custom_component_id;
                  return (
                    <TableRow key={item.custom_component_id} data-state={isSelected ? "selected" : undefined} className="nav-table-row">
                      <TableCell className="nav-table-label">{item.name}</TableCell>
                      <TableCell className="nav-table-href">
                        {componentTypeLabelMap.get(item.component_type as CustomColorType) ?? item.component_type}
                      </TableCell>
                      <TableCell className="nav-table-href">
                        {themeNameMap.get(item.theme_id) ?? "Unknown theme"}
                      </TableCell>
                      <TableCell className="nav-table-actions">
                        <ObjectActionDropdown
                          onEdit={() => startEdit(item)}
                          onDelete={() => setPendingDelete(item)}
                          triggerLabel="Custom component actions"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {renderEditor()}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete custom component"
        description={pendingDelete ? `Delete ${pendingDelete.name}?` : undefined}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
