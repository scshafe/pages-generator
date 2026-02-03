"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import { ConfirmDialog } from "@/blogcomponents/ui/ConfirmDialog";
import { ObjectActionDropdown } from "@/blogcomponents/ui/ObjectActionDropdown";
import { CreationCard } from "@/blogcomponents/ui/CreationCard";
import type { CreationStage, CreationValueState } from "@/blogcomponents/ui/CreationCard";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { PurposeItem } from "@/lib/content/types";

export function PurposesPanel() {
  const [purposes, setPurposes] = useState<PurposeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [selectedPurpose, setSelectedPurpose] = useState<PurposeItem | null>(null);
  const [createVersion, setCreateVersion] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<PurposeItem | null>(null);
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<PurposeItem[]>("/purposes");
        setPurposes(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load purposes");
      }
    };
    load();
  }, []);

  const sortedPurposes = useMemo(
    () => [...purposes].sort((a, b) => a.name.localeCompare(b.name)),
    [purposes]
  );

  const startCreate = useCallback(() => {
    setEditorMode("create");
    setSelectedPurpose(null);
    setCreateVersion((prev) => prev + 1);
  }, []);

  const startEdit = useCallback((item: PurposeItem) => {
    setEditorMode("edit");
    setSelectedPurpose(item);
  }, []);

  const handleCreate = useCallback(async (values: Record<string, CreationValueState>) => {
    const name = String(values.name ?? "").trim();
    if (!name) return;
    try {
      const created = await apiFetch<PurposeItem>("/purposes", {
        method: "POST",
        body: JSON.stringify({ name })
      });
      setPurposes((prev) => [created, ...prev]);
      toast.push("Purpose added", "success");
      setCreateVersion((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add purpose");
      toast.push("Failed to add purpose", "error");
    }
  }, [toast]);

  const handleEditSave = useCallback(async (values: Record<string, CreationValueState>) => {
    if (!selectedPurpose) return;
    const name = String(values.name ?? "").trim();
    if (!name) return;
    try {
      await apiFetch(`/purposes/${selectedPurpose.purpose_id}`, {
        method: "PUT",
        body: JSON.stringify({ name })
      });
      setPurposes((prev) =>
        prev.map((item) => (item.purpose_id === selectedPurpose.purpose_id ? { ...item, name } : item))
      );
      setSelectedPurpose((prev) => (prev ? { ...prev, name } : prev));
      toast.push("Purpose saved", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to save purpose", "error");
    }
  }, [selectedPurpose, toast]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await apiFetch(`/purposes/${pendingDelete.purpose_id}`, { method: "DELETE" });
      setPurposes((prev) => prev.filter((item) => item.purpose_id !== pendingDelete.purpose_id));
      if (selectedPurpose?.purpose_id === pendingDelete.purpose_id) {
        startCreate();
      }
      toast.push("Purpose deleted", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setPendingDelete(null);
    }
  }, [pendingDelete, selectedPurpose, startCreate, toast]);

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
            config: { label: "Name", placeholder: "Purpose" }
          }
        ]
      }
    ];
  }, []);

  const editStages = useMemo<CreationStage[]>(() => {
    return [
      {
        id: "edit",
        values: [
          {
            id: "name",
            type: "text",
            defaultValue: selectedPurpose?.name ?? "",
            validation: { required: true },
            config: { label: "Name", placeholder: "Purpose" }
          }
        ]
      }
    ];
  }, [selectedPurpose]);

  const renderEditor = () => {
    const isEditing = editorMode === "edit" && selectedPurpose;
    const selectedKey = selectedPurpose ? selectedPurpose.purpose_id : "new";
    const creationKey = `purpose-create-${createVersion}`;
    const editKey = `purpose-edit-${selectedKey}`;
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
        <h2>Purposes</h2>
        <p>Create purpose labels for your content.</p>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="nav-panel-grid">
        <div className="section-card nav-table-card">
          <Table className="nav-table">
            <TableBody>
              {sortedPurposes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="nav-table-empty">
                    <span className="muted">No purposes yet.</span>
                  </TableCell>
                </TableRow>
              ) : (
                sortedPurposes.map((item) => {
                  const isSelected = selectedPurpose?.purpose_id === item.purpose_id;
                  return (
                    <TableRow key={item.purpose_id} data-state={isSelected ? "selected" : undefined} className="nav-table-row">
                      <TableCell className="nav-table-label">{item.name}</TableCell>
                      <TableCell className="nav-table-actions">
                        <ObjectActionDropdown
                          onEdit={() => startEdit(item)}
                          onDelete={() => setPendingDelete(item)}
                          triggerLabel="Purpose actions"
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
        title="Delete purpose"
        description={pendingDelete ? `Delete ${pendingDelete.name}?` : undefined}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
