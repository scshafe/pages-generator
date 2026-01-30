"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AssetPicker } from "@/components/author/AssetPicker";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { Switch } from "@/components/ui/Switch";

const textTypes = ["SectionUnit", "PlainTextUnit"] as const;
const contentTypes = ["MarkdownUnit", "AlertUnit"] as const;

export function ComponentEditor({
  nodeId,
  compId,
  componentType,
  config
}: {
  nodeId: number;
  compId: number;
  componentType: string;
  config: Record<string, unknown>;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const toast = useToast();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({
    text: String(config.text ?? ""),
    content: String(config.content ?? ""),
    label: String(config.label ?? ""),
    url: String(config.url ?? ""),
    src: String(config.src ?? ""),
    alt: String(config.alt ?? ""),
    autoplay: String(config.autoplay ?? "false"),
    title: String(config.title ?? ""),
    position: String(config.position ?? ""),
    company: String(config.company ?? ""),
    start_date: String(config.start_date ?? ""),
    end_date: String(config.end_date ?? ""),
    image: String(config.image ?? ""),
    isTransparent: String(config.isTransparent ?? "false"),
    variant: String(config.variant ?? "info"),
    level: String(config.level ?? "h2")
  });
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [linkType, setLinkType] = useState<"internal" | "external">("internal");
  const [externalUrl, setExternalUrl] = useState(String(config.url ?? ""));
  const [views, setViews] = useState<
    { node_id: number | null; config: { path?: string; title?: string; name?: string } }[]
  >([]);
  const [selectedViewId, setSelectedViewId] = useState<number | null>(null);
  const [sections, setSections] = useState<{ node_id: number; title: string }[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  const fields = useMemo(() => {
    if ((textTypes as readonly string[]).includes(componentType)) {
      return [{ key: "text", label: "Text" }];
    }
    if ((contentTypes as readonly string[]).includes(componentType)) {
      return [{ key: "content", label: "Content" }];
    }
    if (componentType === "ImageMedia") {
      return [
        { key: "src", label: "Image URL" },
        { key: "alt", label: "Alt text" }
      ];
    }
    if (componentType === "VideoMedia") {
      return [
        { key: "src", label: "Video URL" },
        { key: "autoplay", label: "Autoplay" }
      ];
    }
    if (componentType === "PDFMedia") {
      return [
        { key: "src", label: "PDF URL" },
        { key: "title", label: "Title" }
      ];
    }
    if (componentType === "ExperienceComponent") {
      return [
        { key: "position", label: "Position" },
        { key: "company", label: "Company" },
        { key: "start_date", label: "Start date" },
        { key: "end_date", label: "End date" },
        { key: "image", label: "Image" },
        { key: "content", label: "Summary" }
      ];
    }
    if (componentType === "StyleContainer") {
      return [
        { key: "isTransparent", label: "Transparent" }
      ];
    }
    return [];
  }, [componentType]);

  const hasAdvanced =
    componentType === "AlertUnit" || componentType === "SectionUnit" || componentType === "LinkUnit";

  const isLinkReady =
    componentType !== "LinkUnit" ||
    linkType === "external" ||
    (linkType === "internal" && selectedViewId && views.length > 0);

  const buildUpdatedConfig = useCallback(() => {
    const updatedConfig = { ...config } as Record<string, unknown>;

    if (componentType === "LinkUnit") {
      updatedConfig.label = formValues.label ?? "";
      if (linkType === "external") {
        updatedConfig.url = externalUrl.trim();
      } else {
        const view = views.find((item) => item.node_id === selectedViewId);
        const basePath = view?.config.path ?? "/";
        const hash = selectedSectionId ? `#section-${selectedSectionId}` : "";
        updatedConfig.url = `${basePath}${hash}`;
      }
    }

    for (const field of fields) {
      updatedConfig[field.key] = formValues[field.key] ?? "";
    }

    if (componentType === "AlertUnit") {
      updatedConfig.variant = formValues.variant || "info";
    }
    if (componentType === "SectionUnit") {
      updatedConfig.level = formValues.level || "h2";
    }
    if (componentType === "VideoMedia") {
      updatedConfig.autoplay = formValues.autoplay === "true";
    }
    if (componentType === "StyleContainer") {
      updatedConfig.isTransparent = formValues.isTransparent === "true";
    }

    return updatedConfig;
  }, [
    componentType,
    config,
    externalUrl,
    fields,
    formValues,
    linkType,
    selectedSectionId,
    selectedViewId,
    views
  ]);

  const loadViews = useCallback(async () => {
    const response = await apiFetch<
      { node_id: number | null; config: { path?: string; title?: string; name?: string } }[]
    >("/views");
    setViews(response);
    return response;
  }, []);

  const loadSections = useCallback(async (viewNodeId: number, presetSectionId?: number | null) => {
    const resolved = await apiFetch<{
      component: { type: string };
      config: Record<string, unknown>;
      node: { node_id: number };
      children: any[];
    }>(`/nodes/${viewNodeId}/resolved`);

    const found: { node_id: number; title: string }[] = [];
    const stack = [resolved];
    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;
      if (current.component?.type === "SectionUnit") {
        const title = String(current.config?.text ?? "Section");
        found.push({ node_id: current.node.node_id, title });
      }
      if (current.children?.length) {
        stack.push(...current.children);
      }
    }

    setSections(found);
    if (presetSectionId) {
      setSelectedSectionId(presetSectionId);
    } else {
      setSelectedSectionId(null);
    }
  }, []);

  useEffect(() => {
    if (componentType !== "LinkUnit" || !isEditing) return;

    const url = String(config.url ?? "");
    const isExternal = /^https?:\/\//i.test(url);
    setLinkType(isExternal ? "external" : "internal");
    setExternalUrl(url);

    loadViews()
      .then((list) => {
        if (isExternal) return;
        const [path, hash] = url.split("#");
        const matchedView = list.find((view) => view.config.path === path);
        const fallback = list.find((view) => view.node_id !== null);
        const chosen = matchedView ?? fallback;
        setSelectedViewId(chosen?.node_id ?? null);
        const sectionId = hash?.startsWith("section-") ? Number(hash.replace("section-", "")) : null;
        if (chosen?.node_id) {
          loadSections(chosen.node_id, sectionId);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load views");
      });
  }, [componentType, isEditing, config.url, loadViews, loadSections]);

  useEffect(() => {
    if (componentType !== "LinkUnit" || !isEditing) return;
    if (linkType === "internal" && selectedViewId) {
      loadSections(selectedViewId, selectedSectionId);
    }
  }, [componentType, isEditing, linkType, selectedViewId, selectedSectionId, loadSections]);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await apiFetch(`/nodes/${nodeId}`, { method: "DELETE" });
      router.refresh();
      toast.push("Component deleted", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      toast.push("Delete failed", "error");
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }

  const saveConfig = useCallback(
    async (options?: { closeAfter?: boolean; silent?: boolean }) => {
      if (isSaving) return;
      setIsSaving(true);
      setSaveStatus("saving");
      setError(null);
      const updatedConfig = buildUpdatedConfig();
      const snapshot = JSON.stringify(updatedConfig);
      try {
        await apiFetch(`/components/${componentType}/${compId}`, {
          method: "PUT",
          body: JSON.stringify({ config: updatedConfig })
        });
        setLastSavedSnapshot(snapshot);
        setSaveStatus("saved");
        if (options?.closeAfter) {
          setIsEditing(false);
        }
        router.refresh();
        if (!options?.silent) {
          toast.push("Component updated", "success");
        }
        setTimeout(() => {
          setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
        setSaveStatus("error");
        if (!options?.silent) {
          toast.push("Save failed", "error");
        }
      } finally {
        setIsSaving(false);
      }
    },
    [buildUpdatedConfig, compId, componentType, isSaving, router, toast]
  );

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    await saveConfig({ closeAfter: true });
  }

  useEffect(() => {
    if (!isEditing) return;
    if (componentType === "LinkUnit" && !isLinkReady) return;
    const snapshot = JSON.stringify(buildUpdatedConfig());
    setLastSavedSnapshot(snapshot);
    setSaveStatus("idle");
  }, [isEditing, componentType, isLinkReady, buildUpdatedConfig]);

  useEffect(() => {
    if (!isEditing) return;
    if (!isLinkReady) return;
    const snapshot = JSON.stringify(buildUpdatedConfig());
    if (snapshot === lastSavedSnapshot) {
      if (saveStatus === "dirty") {
        setSaveStatus("idle");
      }
      return;
    }
    if (!isSaving) {
      setSaveStatus("dirty");
    }
    const timer = setTimeout(() => {
      saveConfig({ silent: true });
    }, 900);
    return () => clearTimeout(timer);
  }, [
    isEditing,
    isLinkReady,
    componentType,
    formValues,
    linkType,
    externalUrl,
    selectedViewId,
    selectedSectionId,
    views,
    lastSavedSnapshot,
    buildUpdatedConfig,
    saveConfig,
    isSaving,
    saveStatus
  ]);

  if (!fields.length && !hasAdvanced) {
    return (
      <div className="author-actions component-actions">
        <div className="component-header">
          <span className="component-type">{componentType}</span>
          <div className="action-group action-group--right">
            <button
              className="button danger small"
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
        {error ? <div className="alert">{error}</div> : null}
      </div>
    );
  }

  return (
    <div className="author-actions component-actions">
      <div className="component-header">
        <span className="component-type">{componentType}</span>
        <div className="action-group action-group--right">
          <button
            className="button edit small"
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
          >
            {isEditing ? "Close" : "Edit"}
          </button>
          <button
            className="button danger small"
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          {isEditing && saveStatus !== "idle" ? (
            <span className={`status-chip status-${saveStatus}`}>
              {saveStatus === "dirty" ? "Unsaved changes" : null}
              {saveStatus === "saving" ? "Saving..." : null}
              {saveStatus === "saved" ? "Saved" : null}
              {saveStatus === "error" ? "Save failed" : null}
            </span>
          ) : null}
        </div>
      </div>

      {isEditing ? (
        <form className="form-grid" onSubmit={handleSave}>
          {fields.map((field) => {
          if (field.key === "isTransparent" || field.key === "autoplay") {
            return (
              <div key={field.key} className="toggle-row">
                <span>{field.label}</span>
                <Switch
                  checked={formValues[field.key] === "true"}
                  onCheckedChange={(checked) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [field.key]: checked ? "true" : "false"
                    }))
                  }
                  aria-label={field.label}
                />
              </div>
            );
          }
            return (
              <label key={field.key}>
                <span>{field.label}</span>
                {componentType === "MarkdownUnit" && field.key === "content" ? (
                  <textarea
                    value={formValues[field.key] ?? ""}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                ) : componentType === "ExperienceComponent" && field.key === "content" ? (
                  <textarea
                    value={formValues[field.key] ?? ""}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                ) : (
                  <input
                    value={formValues[field.key] ?? ""}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                )}
              </label>
            );
          })}
          {componentType === "ImageMedia" ? (
            <AssetPicker
              label="Choose from library"
              allowedPrefixes={["image/"]}
              onSelect={(src) => setFormValues((prev) => ({ ...prev, src }))}
            />
          ) : null}
          {componentType === "VideoMedia" ? (
            <AssetPicker
              label="Choose video from library"
              allowedPrefixes={["video/"]}
              onSelect={(src) => setFormValues((prev) => ({ ...prev, src }))}
            />
          ) : null}
          {componentType === "PDFMedia" ? (
            <AssetPicker
              label="Choose PDF from library"
              allowedPrefixes={["application/pdf"]}
              onSelect={(src) => setFormValues((prev) => ({ ...prev, src }))}
            />
          ) : null}
          {componentType === "MarkdownUnit" ? (
            <div className="form-grid">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={showMarkdownPreview}
                  onChange={(event) => setShowMarkdownPreview(event.target.checked)}
                />
                <span>Preview markdown</span>
              </label>
              {showMarkdownPreview ? (
                <div className="section-card">
                  <ReactMarkdown>{formValues.content ?? ""}</ReactMarkdown>
                </div>
              ) : null}
            </div>
          ) : null}
          {componentType === "LinkUnit" ? (
            <div className="link-editor">
              <label>
                <span>Label</span>
                <input
                  value={formValues.label ?? ""}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, label: event.target.value }))
                  }
                  placeholder="Link label"
                />
              </label>
              <div className="toggle-row">
                <label className="toggle">
                  <input
                    type="radio"
                    name={`linkType-${nodeId}`}
                    value="internal"
                    checked={linkType === "internal"}
                    onChange={() => setLinkType("internal")}
                  />
                  <span>Internal</span>
                </label>
                <label className="toggle">
                  <input
                    type="radio"
                    name={`linkType-${nodeId}`}
                    value="external"
                    checked={linkType === "external"}
                    onChange={() => setLinkType("external")}
                  />
                  <span>External</span>
                </label>
              </div>
              {linkType === "external" ? (
                <label>
                  <span>URL</span>
                  <input
                    value={externalUrl}
                    onChange={(event) => setExternalUrl(event.target.value)}
                    placeholder="https://example.com"
                  />
                </label>
              ) : (
                <div className="form-grid">
                  <label>
                    <span>View</span>
                    <select
                      value={selectedViewId ?? ""}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        setSelectedViewId(next);
                        loadSections(next);
                      }}
                    >
                      {views.map((view) => (
                        <option key={view.node_id ?? view.config.path ?? "unknown"} value={view.node_id ?? ""}>
                          {view.config.title ?? view.config.name ?? view.config.path ?? "Untitled"}
                        </option>
                      ))}
                    </select>
                  </label>
                  {sections.length ? (
                    <label>
                      <span>Section</span>
                      <select
                        value={selectedSectionId ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSelectedSectionId(value ? Number(value) : null);
                        }}
                      >
                        <option value="">None</option>
                        {sections.map((section) => (
                          <option key={section.node_id} value={section.node_id}>
                            {section.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
          {componentType === "AlertUnit" ? (
            <label>
              <span>Variant</span>
              <select
                value={formValues.variant}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, variant: event.target.value }))
                }
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
              </select>
            </label>
          ) : null}
          {componentType === "SectionUnit" ? (
            <label>
              <span>Heading level</span>
              <select
                value={formValues.level}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, level: event.target.value }))
                }
              >
                <option value="h1">H1</option>
                <option value="h2">H2</option>
                <option value="h3">H3</option>
              </select>
            </label>
          ) : null}
          <button className="button" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
        </form>
      ) : null}
      {error ? <div className="alert">{error}</div> : null}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete component"
        description="This will remove the component and its data."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        danger
        isBusy={isDeleting}
      />
    </div>
  );
}
