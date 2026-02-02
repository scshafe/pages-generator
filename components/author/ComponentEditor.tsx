"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AssetPicker } from "@/components/author/AssetPicker";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useToast } from "@/components/ui/ToastProvider";
import { Switch } from "@/components/ui/Switch";
import { resolveGroupKind } from "@/lib/content/containers";

const textTypes = ["PlainTextUnit"] as const;
const contentTypes = ["MarkdownUnit", "AlertUnit"] as const;
const codeTypes = ["CodeUnit", "CodeBlockUnit"] as const;

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
  const isEditing = true;
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "dirty" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({
    text: String(config.text ?? ""),
    content: String(config.content ?? ""),
    useAI: String(Boolean((config as { useAI?: boolean }).useAI)),
    aiPrompt: String((config as { aiPrompt?: string }).aiPrompt ?? ""),
    code: String((config as { code?: string }).code ?? ""),
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
    group_kind: String((config as { group_kind?: string }).group_kind ?? ""),
    listType: String((config as { listType?: string }).listType ?? ""),
    displayMode: String((config as { displayMode?: string }).displayMode ?? "list"),
    name: String((config as { name?: string }).name ?? "")
  });
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [linkType, setLinkType] = useState<"internal" | "external">("internal");
  const [externalUrl, setExternalUrl] = useState(String(config.url ?? ""));
  const [views, setViews] = useState<
    { node_id: number | null; config: { path?: string; title?: string; name?: string } }[]
  >([]);
  const [selectedViewId, setSelectedViewId] = useState<number | null>(null);
  const [anchors, setAnchors] = useState<{ hash: string; title: string }[]>([]);
  const [selectedAnchorHash, setSelectedAnchorHash] = useState<string | null>(null);


  const groupKind = formValues.group_kind || resolveGroupKind(componentType, config);
  const isGroup = componentType === "Group";

  const fields = useMemo(() => {
    if ((textTypes as readonly string[]).includes(componentType)) {
      return [{ key: "text", label: "Text" }];
    }
    if ((contentTypes as readonly string[]).includes(componentType)) {
      return [{ key: "content", label: "Content" }];
    }
    if ((codeTypes as readonly string[]).includes(componentType)) {
      return [{ key: "code", label: "Code" }];
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
    return [];
  }, [componentType]);

  const hasAdvanced =
    componentType === "AlertUnit" ||
    componentType === "LinkUnit" ||
    componentType === "ButtonUnit";

  const isLinkReady =
    (componentType !== "LinkUnit" && componentType !== "ButtonUnit") ||
    linkType === "external" ||
    (linkType === "internal" && selectedViewId && views.length > 0);

  const aiEnabled = formValues.useAI === "true";
  const componentLabel = isGroup ? `Group (${groupKind || "inline"})` : componentType;

  const buildUpdatedConfig = useCallback(() => {
    const updatedConfig = { ...config } as Record<string, unknown>;

    if (componentType === "LinkUnit" || componentType === "ButtonUnit") {
      updatedConfig.label = formValues.label ?? "";
      if (linkType === "external") {
        updatedConfig.url = externalUrl.trim();
      } else {
        const view = views.find((item) => item.node_id === selectedViewId);
        const basePath = view?.config.path ?? "/";
        const hash = selectedAnchorHash ? `#${selectedAnchorHash}` : "";
        updatedConfig.url = `${basePath}${hash}`;
      }
    }

    for (const field of fields) {
      updatedConfig[field.key] = formValues[field.key] ?? "";
    }

    if (componentType === "AlertUnit") {
      updatedConfig.variant = formValues.variant || "info";
    }
    if (componentType === "VideoMedia") {
      updatedConfig.autoplay = formValues.autoplay === "true";
    }
    if (isGroup) {
      updatedConfig.group_kind = groupKind;
      if (groupKind === "style") {
        updatedConfig.isTransparent = formValues.isTransparent === "true";
      }
      if (groupKind === "list") {
        updatedConfig.listType = formValues.listType ?? "";
        updatedConfig.displayMode = formValues.displayMode ?? "list";
        updatedConfig.name = formValues.name ?? "";
      }
    }

    const useAI = formValues.useAI === "true";
    updatedConfig.useAI = useAI;
    updatedConfig.aiPrompt = useAI ? formValues.aiPrompt ?? "" : "";

    return updatedConfig;
  }, [
    componentType,
    config,
    groupKind,
    externalUrl,
    fields,
    formValues,
    isGroup,
    linkType,
    selectedAnchorHash,
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

  const isLinkableComponent = useCallback((componentType: string) => {
    return componentType !== "Container" && componentType !== "Group";
  }, []);

  const getAnchorLabel = useCallback((componentType: string, config: Record<string, unknown>) => {
    switch (componentType) {
      case "PlainTextUnit":
        return String(config.text ?? "Text");
      case "DividorUnit":
        return "Dividor";
      case "MarkdownUnit":
        return String(config.content ?? "Markdown").slice(0, 60);
      case "AlertUnit":
        return String(config.content ?? "Alert").slice(0, 60);
      case "CodeUnit":
        return String(config.code ?? "Code").slice(0, 60);
      case "CodeBlockUnit":
        return String(config.code ?? "Code block").slice(0, 60);
      case "LinkUnit":
        return String(config.label ?? "Link");
      case "ButtonUnit":
        return String(config.label ?? "Button");
      case "ImageMedia":
      case "VideoMedia":
      case "PDFMedia":
        return String(config.src ?? "Media");
      case "ExperienceComponent":
        return String(config.position ?? "Role");
      default:
        return componentType;
    }
  }, []);

  const loadAnchors = useCallback(async (viewNodeId: number, presetAnchorHash?: string | null) => {
    const resolved = await apiFetch<{
      component: { type: string };
      config: Record<string, unknown>;
      node: { node_id: number };
      children: any[];
    }>(`/nodes/${viewNodeId}/resolved`);

    const found: { hash: string; title: string }[] = [];
    const stack = [resolved];
    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;
      const type = current.component?.type;
      if (type === "Container") {
        const label = String(current.config?.name ?? current.config?.title ?? "Container");
        const firstChild = current.children?.[0];
        if (firstChild) {
          const childType = firstChild.component?.type;
          const hash = childType === "Group"
            ? `group-${firstChild.node.node_id}`
            : `unit-${firstChild.node.node_id}`;
          found.push({ hash, title: label });
        }
      } else if (type === "Group") {
        const kind = resolveGroupKind(type, current.config ?? {}) || "inline";
        const label = String(current.config?.name ?? `Group (${kind})`);
        found.push({ hash: `group-${current.node.node_id}`, title: label });
      } else if (type && isLinkableComponent(type)) {
        const title = getAnchorLabel(type, current.config ?? {});
        found.push({ hash: `unit-${current.node.node_id}`, title });
      }
      if (current.children?.length) {
        stack.push(...current.children);
      }
    }

    setAnchors(found);
    if (presetAnchorHash) {
      setSelectedAnchorHash(presetAnchorHash);
    } else {
      setSelectedAnchorHash(null);
    }
  }, [getAnchorLabel, isLinkableComponent]);

  useEffect(() => {
    if (componentType !== "LinkUnit" && componentType !== "ButtonUnit") return;

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
        const anchorHash = hash ? hash : null;
        if (chosen?.node_id) {
          loadAnchors(chosen.node_id, anchorHash);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load views");
      });
  }, [componentType, config.url, loadViews, loadAnchors]);

  useEffect(() => {
    if (componentType !== "LinkUnit" && componentType !== "ButtonUnit") return;
    if (linkType === "internal" && selectedViewId) {
      loadAnchors(selectedViewId, selectedAnchorHash);
    }
  }, [componentType, linkType, selectedViewId, selectedAnchorHash, loadAnchors]);

  const saveConfig = useCallback(
    async (options?: { silent?: boolean }) => {
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
    await saveConfig();
  }

  useEffect(() => {
    if ((componentType === "LinkUnit" || componentType === "ButtonUnit") && !isLinkReady) return;
    const snapshot = JSON.stringify(buildUpdatedConfig());
    setLastSavedSnapshot(snapshot);
    setSaveStatus("idle");
  }, [componentType, isLinkReady, buildUpdatedConfig]);

  useEffect(() => {
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
    isLinkReady,
    componentType,
    formValues,
    linkType,
    externalUrl,
    selectedViewId,
    selectedAnchorHash,
    views,
    lastSavedSnapshot,
    buildUpdatedConfig,
    saveConfig,
    isSaving,
    saveStatus
  ]);

  return (
    <div className="author-actions component-actions">
      <div className="component-header">
        <span className="component-type">{componentLabel}</span>
        {saveStatus !== "idle" ? (
          <span className={`status-chip status-${saveStatus}`}>
            {saveStatus === "dirty" ? "Unsaved changes" : null}
            {saveStatus === "saving" ? "Saving..." : null}
            {saveStatus === "saved" ? "Saved" : null}
            {saveStatus === "error" ? "Save failed" : null}
          </span>
        ) : null}
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
                ) : (codeTypes as readonly string[]).includes(componentType) && field.key === "code" ? (
                  <textarea
                    className="code-input"
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
          {isGroup ? (
            <div className="form-grid">
              <label>
                <span>Group type</span>
                <select
                  value={groupKind}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      group_kind: event.target.value
                    }))
                  }
                >
                  <option value="style">Style</option>
                  <option value="inline">Inline</option>
                  <option value="list">List</option>
                </select>
              </label>
              {groupKind === "style" ? (
                <div className="toggle-row">
                  <span>Transparent</span>
                  <Switch
                    checked={formValues.isTransparent === "true"}
                    onCheckedChange={(checked) =>
                      setFormValues((prev) => ({
                        ...prev,
                        isTransparent: checked ? "true" : "false"
                      }))
                    }
                    aria-label="Transparent"
                  />
                </div>
              ) : null}
              {groupKind === "list" ? (
                <>
                  <label>
                    <span>List type</span>
                    <select
                      value={formValues.listType ?? "View"}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          listType: event.target.value
                        }))
                      }
                    >
                      <option value="View">View</option>
                      <option value="">Any</option>
                    </select>
                  </label>
                  <label>
                    <span>Display mode</span>
                    <select
                      value={formValues.displayMode ?? "list"}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          displayMode: event.target.value
                        }))
                      }
                    >
                      <option value="list">List</option>
                      <option value="grid">Grid</option>
                      <option value="cards">Cards</option>
                    </select>
                  </label>
                  <label>
                    <span>Name</span>
                    <input
                      value={formValues.name ?? ""}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </label>
                </>
              ) : null}
            </div>
          ) : null}
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
          {componentType === "LinkUnit" || componentType === "ButtonUnit" ? (
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
                        loadAnchors(next);
                      }}
                    >
                      {views.map((view) => (
                        <option key={view.node_id ?? view.config.path ?? "unknown"} value={view.node_id ?? ""}>
                          {view.config.title ?? view.config.name ?? view.config.path ?? "Untitled"}
                        </option>
                      ))}
                    </select>
                  </label>
                  {anchors.length ? (
                    <label>
                      <span>Anchor</span>
                      <select
                        value={selectedAnchorHash ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSelectedAnchorHash(value || null);
                        }}
                      >
                        <option value="">None</option>
                        {anchors.map((anchor) => (
                          <option key={anchor.hash} value={anchor.hash}>
                            {anchor.title}
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
          <div className="ai-controls">
            <div className="toggle-row">
              <span>Use AI</span>
              <Switch
                checked={aiEnabled}
                onCheckedChange={(checked) =>
                  setFormValues((prev) => ({
                    ...prev,
                    useAI: checked ? "true" : "false"
                  }))
                }
                aria-label="Use AI"
              />
            </div>
            {aiEnabled ? (
              <label>
                <span>Prompt</span>
                <textarea
                  value={formValues.aiPrompt ?? ""}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, aiPrompt: event.target.value }))
                  }
                  placeholder="Describe the content to generate"
                />
              </label>
            ) : null}
          </div>
          <button className="button" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
        </form>
      ) : null}
      {error ? <div className="alert">{error}</div> : null}
    </div>
  );
}
