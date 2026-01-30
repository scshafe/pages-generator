"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { AssetPicker } from "@/components/author/AssetPicker";
import { useToast } from "@/components/ui/ToastProvider";
import { Switch } from "@/components/ui/Switch";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { siteConfig } from "@/site.config";

const componentOptions = [
  { value: "SectionUnit", label: "Section" },
  { value: "PlainTextUnit", label: "Plain Text" },
  { value: "MarkdownUnit", label: "Markdown" },
  { value: "AlertUnit", label: "Alert" },
  { value: "LinkUnit", label: "Link" },
  { value: "ImageMedia", label: "Image" },
  { value: "VideoMedia", label: "Video" },
  { value: "PDFMedia", label: "PDF" },
  { value: "ExperienceComponent", label: "Experience" },
  { value: "StyleContainer", label: "Style Container" },
  { value: "Mirror", label: "Mirror Existing" }
] as const;

type ComponentType = (typeof componentOptions)[number]["value"];

function buildConfig(type: ComponentType, values: Record<string, string>) {
  switch (type) {
    case "SectionUnit":
      return { text: values.text ?? "New section", level: "h2" };
    case "PlainTextUnit":
      return { text: values.text ?? "" };
    case "MarkdownUnit":
      return { content: values.content ?? "" };
    case "AlertUnit":
      return { content: values.content ?? "", variant: "info" };
    case "LinkUnit":
      return { label: values.label ?? "Link", url: values.url ?? "/" };
    case "ImageMedia":
      return { src: values.src ?? "", alt: values.alt ?? "" };
    case "VideoMedia":
      return { src: values.src ?? "", autoplay: values.autoplay === "true" };
    case "PDFMedia":
      return { src: values.src ?? "", title: values.title ?? "" };
    case "ExperienceComponent":
      return {
        position: values.position ?? "",
        company: values.company ?? "",
        start_date: values.start_date ?? "",
        end_date: values.end_date ?? "",
        image: values.image ?? "",
        content: values.content ?? ""
      };
    case "StyleContainer":
      return {
        isTransparent: values.isTransparent === "true",
        child_node_id: null
      };
    case "Mirror":
      return {};
    default:
      return {};
  }
}

export function AddComponentForm({
  parentNodeId,
  submitLabel = "Add component",
  submitClassName = "button",
  onAdded
}: {
  parentNodeId: number;
  submitLabel?: string;
  submitClassName?: string;
  onAdded?: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<ComponentType>("SectionUnit");
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [relativeUrl, setRelativeUrl] = useState("");
  const [linkType, setLinkType] = useState<"internal" | "external">("internal");
  const [views, setViews] = useState<{ node_id: number | null; config: { path?: string; title?: string; name?: string } }[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<number | null>(null);
  const [sections, setSections] = useState<{ node_id: number; title: string }[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [mirrorViews, setMirrorViews] = useState<
    { node_id: number | null; config: { path?: string; title?: string; name?: string } }[]
  >([]);
  const [mirrorViewId, setMirrorViewId] = useState<number | null>(null);
  const [mirrorComponents, setMirrorComponents] = useState<
    { ref_id: number; comp_id: number; type: string; label: string; node_id: number; preview?: string; previewSrc?: string; childCount?: number; overrides?: Record<string, unknown> | null }[]
  >([]);
  const [mirrorType, setMirrorType] = useState<string>("");
  const [mirrorItemId, setMirrorItemId] = useState<number | null>(null);
  const toast = useToast();

  const fields = useMemo(() => {
    switch (type) {
      case "SectionUnit":
      case "PlainTextUnit":
        return [{ key: "text", label: "Text", placeholder: "Content" }];
      case "MarkdownUnit":
      case "AlertUnit":
        return [{ key: "content", label: "Content", placeholder: "Markdown or alert content" }];
      case "VideoMedia":
        return [
          { key: "src", label: "Video URL", placeholder: "/videos/demo.mp4" },
          { key: "autoplay", label: "Autoplay", placeholder: "" }
        ];
      case "PDFMedia":
        return [
          { key: "src", label: "PDF URL", placeholder: "/docs/guide.pdf" },
          { key: "title", label: "Title", placeholder: "Document title" }
        ];
      case "ExperienceComponent":
        return [
          { key: "position", label: "Position", placeholder: "Lead Designer" },
          { key: "company", label: "Company", placeholder: "Studio" },
          { key: "start_date", label: "Start date", placeholder: "2022" },
          { key: "end_date", label: "End date", placeholder: "Present" },
          { key: "image", label: "Image", placeholder: "/images/logo.png" },
          { key: "content", label: "Summary", placeholder: "Role summary" }
        ];
      case "StyleContainer":
        return [
          { key: "isTransparent", label: "Transparent", placeholder: "" }
        ];
      case "Mirror":
        return [];
      default:
        return [];
    }
  }, [type]);

  const loadSections = useCallback(async (viewNodeId: number) => {
    try {
      const resolved = await apiFetch<{ component: { type: string }; config: Record<string, unknown>; node: { node_id: number }; children: any[] }>(
        `/nodes/${viewNodeId}/resolved`
      );
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
      setSelectedSectionId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sections");
    }
  }, []);

  const loadViews = useCallback(async () => {
    try {
      const response = await apiFetch<{ node_id: number | null; config: { path?: string; title?: string; name?: string } }[]>("/views");
      setViews(response);
      if (!selectedViewId) {
        const first = response.find((view) => view.node_id !== null);
        setSelectedViewId(first?.node_id ?? null);
        if (first?.node_id) {
          loadSections(first.node_id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load views");
    }
  }, [selectedViewId, loadSections]);

  const extractMirrorLabel = useCallback((componentType: string, config: Record<string, unknown>) => {
    switch (componentType) {
      case "SectionUnit":
        return String(config.text ?? "Section");
      case "PlainTextUnit":
        return String(config.text ?? "Text");
      case "MarkdownUnit":
        return String(config.content ?? "Markdown").slice(0, 60);
      case "AlertUnit":
        return String(config.content ?? "Alert").slice(0, 60);
      case "LinkUnit":
        return String(config.label ?? "Link");
      case "ImageMedia":
      case "VideoMedia":
      case "PDFMedia":
        return String(config.src ?? "Media");
      case "ExperienceComponent":
        return `${String(config.position ?? "Role")} @ ${String(config.company ?? "")}`.trim();
      case "ListContainer":
      case "InlineContainer":
      case "StyleContainer":
        return componentType;
      default:
        return componentType;
    }
  }, []);

  const extractMirrorPreview = useCallback(
    (componentType: string, config: Record<string, unknown>, childCount: number) => {
      switch (componentType) {
        case "SectionUnit":
        case "PlainTextUnit":
          return String(config.text ?? "").slice(0, 120);
        case "MarkdownUnit":
        case "AlertUnit":
          return String(config.content ?? "").slice(0, 120);
        case "LinkUnit":
          return String(config.url ?? "");
        case "ImageMedia":
        case "VideoMedia":
        case "PDFMedia":
          return String(config.src ?? "");
        case "ExperienceComponent":
          return String(config.content ?? "").slice(0, 120);
        case "ListContainer":
        case "InlineContainer":
        case "StyleContainer":
          return `${childCount} child component${childCount === 1 ? "" : "s"}`;
        default:
          return "";
      }
    },
    []
  );

  const loadMirrorComponents = useCallback(async (viewNodeId: number) => {
    try {
      const resolved = await apiFetch<{
        component: { type: string; comp_id: number };
        reference?: { ref_id: number; overrides?: Record<string, unknown> | null };
        config: Record<string, unknown>;
        node: { node_id: number };
        children: any[];
      }>(`/nodes/${viewNodeId}/resolved`);
      const items: { ref_id: number; comp_id: number; type: string; label: string; node_id: number; preview?: string; previewSrc?: string; childCount?: number; overrides?: Record<string, unknown> | null }[] = [];
      const stack = [resolved];
      while (stack.length) {
        const current = stack.pop();
        if (!current) continue;
        const type = current.component?.type;
        if (type && type !== "ViewContainer") {
          const childCount = current.children?.length ?? 0;
          const preview = extractMirrorPreview(type, current.config ?? {}, childCount);
          const previewSrc = type === "ImageMedia" ? String(current.config?.src ?? "") : undefined;
          items.push({
            ref_id: current.reference?.ref_id ?? current.node.node_id,
            comp_id: current.component.comp_id,
            type,
            label: extractMirrorLabel(type, current.config ?? {}),
            node_id: current.node.node_id,
            preview,
            previewSrc,
            childCount,
            overrides: current.reference?.overrides ?? null
          });
        }
        if (current.children?.length) {
          stack.push(...current.children);
        }
      }
      setMirrorComponents(items);
      const typeOptions = Array.from(new Set(items.map((item) => item.type)));
      const nextType = typeOptions[0] ?? "";
      setMirrorType(nextType);
      const firstItem = items.find((item) => item.type === nextType) ?? items[0];
      setMirrorItemId(firstItem?.ref_id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mirror components");
    }
  }, [extractMirrorLabel, extractMirrorPreview]);

  const loadMirrorViews = useCallback(async () => {
    try {
      const response = await apiFetch<{ node_id: number | null; config: { path?: string; title?: string; name?: string } }[]>("/views");
      setMirrorViews(response);
      if (!mirrorViewId) {
        const first = response.find((view) => view.node_id !== null);
        setMirrorViewId(first?.node_id ?? null);
        if (first?.node_id) {
          loadMirrorComponents(first.node_id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mirror views");
    }
  }, [mirrorViewId, loadMirrorComponents]);

  useEffect(() => {
    if (type === "LinkUnit" && linkType === "internal" && views.length === 0) {
      loadViews();
    }
    if (type === "Mirror" && mirrorViews.length === 0) {
      loadMirrorViews();
    }
    if (type !== "LinkUnit") {
      setLinkType("internal");
      setExternalUrl("");
      setSelectedSectionId(null);
    }
  }, [type, linkType, loadViews, views.length, mirrorViews.length, loadMirrorViews]);

  useEffect(() => {
    if (type !== "Mirror") return;
    if (mirrorViewId) {
      loadMirrorComponents(mirrorViewId);
    }
  }, [type, mirrorViewId, loadMirrorComponents]);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${siteConfig.authorApiBaseUrl}/save-image`, {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Upload failed");
    }
    return (await response.json()) as { src: string };
  }

  async function fetchExternalImage(url: string) {
    const response = await fetch(`${siteConfig.authorApiBaseUrl}/fetch-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Fetch failed");
    }
    return (await response.json()) as { src: string };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      let nextValues = { ...values };
      if (type === "Mirror") {
        if (!mirrorViewId) {
          throw new Error("Select a view to mirror from");
        }
        if (!mirrorItemId) {
          throw new Error("Select a component to mirror");
        }
        if (mirrorType && mirrorComponents.filter((item) => item.type === mirrorType).length === 0) {
          throw new Error("No components match that type");
        }
      }
      if (type === "LinkUnit") {
        if (linkType === "external") {
          nextValues.url = externalUrl.trim();
        } else {
          const view = views.find((item) => item.node_id === selectedViewId);
          const basePath = view?.config.path ?? "/";
          const hash = selectedSectionId ? `#section-${selectedSectionId}` : "";
          nextValues.url = `${basePath}${hash}`;
        }
      }
      if (type === "Mirror") {
        if (!mirrorItemId) {
          throw new Error("Select a component to mirror");
        }
        const selected = mirrorComponents.find((item) => item.ref_id === mirrorItemId);
        if (!selected) {
          throw new Error("Selected component not found");
        }
        await apiFetch(`/nodes/${parentNodeId}/children/mirror`, {
          method: "POST",
          body: JSON.stringify({
            comp_id: selected.comp_id,
            overrides: selected.overrides ?? null
          })
        });
      } else {
        await apiFetch(`/nodes/${parentNodeId}/children`, {
          method: "POST",
          body: JSON.stringify({
            component_type: type,
            config: buildConfig(type, nextValues)
          })
        });
      }
      setValues({});
      setExternalUrl("");
      setRelativeUrl("");
      setMirrorItemId(null);
      setMirrorComponents([]);
      setMirrorType("");
      router.refresh();
      toast.push("Component added", "success");
      if (onAdded) {
        onAdded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add component");
      toast.push("Failed to add component", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("File is larger than 20MB");
      toast.push("File is larger than 20MB", "error");
      return;
    }
    try {
      setIsUploading(true);
      setError(null);
      const result = await uploadFile(file);
      setValues((prev) => ({ ...prev, src: result.src }));
      toast.push("Image uploaded", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
      toast.push("Upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFetchExternal() {
    if (!externalUrl.trim()) return;
    try {
      setIsUploading(true);
      setError(null);
      const result = await fetchExternalImage(externalUrl.trim());
      setValues((prev) => ({ ...prev, src: result.src }));
      toast.push("Image fetched", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch image");
      toast.push("Fetch failed", "error");
    } finally {
      setIsUploading(false);
    }
  }

  function handleUseRelative() {
    if (!relativeUrl.trim()) return;
    const normalized = relativeUrl.startsWith("/") ? relativeUrl.trim() : `/${relativeUrl.trim()}`;
    setValues((prev) => ({ ...prev, src: normalized }));
  }

  return (
    <form className="author-card" onSubmit={handleSubmit}>
      <div className="author-header">
        <h3>Add component</h3>
        <select value={type} onChange={(event) => setType(event.target.value as ComponentType)}>
          {componentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-grid">
        {fields.map((field) => {
          if (field.key === "isTransparent" || field.key === "autoplay") {
            return (
              <div key={field.key} className="toggle-row">
                <span>{field.label}</span>
                <Switch
                  checked={values[field.key] === "true"}
                  onCheckedChange={(checked) =>
                    setValues((prev) => ({
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
              {type === "MarkdownUnit" && field.key === "content" ? (
                <textarea
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  value={values[field.key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  placeholder={field.placeholder}
                />
              )}
            </label>
          );
        })}
        {type === "Mirror" ? (
          <div className="form-grid">
            <label>
              <span>Component type</span>
              <select
                value={mirrorType}
                onChange={(event) => {
                  const nextType = event.target.value;
                  setMirrorType(nextType);
                  const first = mirrorComponents.find((item) => item.type === nextType);
                  setMirrorItemId(first?.ref_id ?? null);
                }}
                disabled={mirrorComponents.length === 0}
              >
                {Array.from(new Set(mirrorComponents.map((item) => item.type))).map((typeOption) => (
                  <option key={typeOption} value={typeOption}>
                    {typeOption}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>View</span>
              <select
                value={mirrorViewId ?? ""}
                onChange={(event) => {
                  const nextId = Number(event.target.value);
                  setMirrorViewId(nextId);
                }}
                onFocus={() => {
                  if (mirrorViews.length === 0) {
                    loadMirrorViews();
                  }
                }}
              >
                {mirrorViews
                  .filter((view) => view.node_id !== null)
                  .map((view) => (
                    <option key={view.node_id ?? view.config.path ?? "unknown"} value={view.node_id ?? ""}>
                      {view.config.title ?? view.config.name ?? view.config.path ?? "Untitled"}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Component</span>
              <select
                value={mirrorItemId ?? ""}
                onChange={(event) => setMirrorItemId(Number(event.target.value))}
                disabled={mirrorComponents.length === 0 || !mirrorType || mirrorComponents.filter((item) => item.type === mirrorType).length === 0}
              >
                {mirrorComponents
                  .filter((item) => !mirrorType || item.type === mirrorType)
                  .map((item) => (
                    <option key={`${item.ref_id}-${item.node_id}`} value={item.ref_id}>
                      {item.label}
                    </option>
                  ))}
              </select>
              {mirrorType && mirrorComponents.filter((item) => item.type === mirrorType).length === 0 ? (
                <span className="form-hint error">No components match that type.</span>
              ) : null}
            </label>
            {mirrorItemId ? (
              <div className="mirror-preview">
                {mirrorComponents
                  .filter((item) => item.ref_id === mirrorItemId)
                  .map((item) => (
                    <div key={`preview-${item.ref_id}`}>
                      <strong>{item.label}</strong>
                      <div className="muted">{item.type}</div>
                      {item.previewSrc ? (
                        <div className="image-preview">
                          <Image
                            src={item.previewSrc}
                            alt={item.label}
                            width={640}
                            height={360}
                            unoptimized
                            style={{ width: "100%", height: "auto" }}
                          />
                        </div>
                      ) : item.preview ? (
                        <div className="muted">{item.preview}</div>
                      ) : null}
                    </div>
                  ))}
              </div>
            ) : null}
            {!mirrorComponents.length ? (
              <p className="muted">No components found for that view.</p>
            ) : null}
          </div>
        ) : null}
        {type === "MarkdownUnit" ? (
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
                <ReactMarkdown>{values.content ?? ""}</ReactMarkdown>
              </div>
            ) : null}
          </div>
        ) : null}
        {type === "LinkUnit" ? (
          <div className="link-editor">
            <label>
              <span>Label</span>
              <input
                value={values.label ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, label: event.target.value }))
                }
                placeholder="Link label"
              />
            </label>
            <div className="toggle-row">
              <label className="toggle">
                <input
                  type="radio"
                  name="linkType"
                  value="internal"
                  checked={linkType === "internal"}
                  onChange={() => setLinkType("internal")}
                />
                <span>Internal</span>
              </label>
              <label className="toggle">
                <input
                  type="radio"
                  name="linkType"
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
                    onFocus={() => {
                      if (views.length === 0) {
                        loadViews();
                      }
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
        {type === "ImageMedia" ? (
          <div className="image-uploader">
            {values.src ? (
              <div className="image-preview">
                <Image
                  src={values.src}
                  alt={values.alt ?? ""}
                  width={960}
                  height={540}
                  unoptimized
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
            ) : null}
            <div className="form-grid">
              <AssetPicker
                label="Choose from library"
                allowedPrefixes={["image/"]}
                onSelect={(src) => setValues((prev) => ({ ...prev, src }))}
              />
              <label>
                <span>Upload file</span>
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </label>
              <label>
                <span>Fetch external URL</span>
                <div className="form-row">
                  <input
                    value={externalUrl}
                    onChange={(event) => setExternalUrl(event.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <button className="button ghost" type="button" onClick={handleFetchExternal} disabled={isUploading}>
                    Fetch
                  </button>
                </div>
              </label>
              <label>
                <span>Use relative URL</span>
                <div className="form-row">
                  <input
                    value={relativeUrl}
                    onChange={(event) => setRelativeUrl(event.target.value)}
                    placeholder="/images/hero.jpg"
                  />
                  <button className="button ghost" type="button" onClick={handleUseRelative}>
                    Use
                  </button>
                </div>
              </label>
              <label>
                <span>Alt text</span>
                <input
                  value={values.alt ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, alt: event.target.value }))
                  }
                  placeholder="Optional description"
                />
              </label>
            </div>
          </div>
        ) : null}
        {type === "VideoMedia" ? (
          <div className="form-grid">
            <AssetPicker
              label="Choose video from library"
              allowedPrefixes={["video/"]}
              onSelect={(src) => setValues((prev) => ({ ...prev, src }))}
            />
          </div>
        ) : null}
        {type === "PDFMedia" ? (
          <div className="form-grid">
            <AssetPicker
              label="Choose PDF from library"
              allowedPrefixes={["application/pdf"]}
              onSelect={(src) => setValues((prev) => ({ ...prev, src }))}
            />
          </div>
        ) : null}
      </div>
      {error ? <div className="alert">{error}</div> : null}
      <button className={submitClassName} type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
