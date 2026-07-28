"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { AssetPicker } from "@/blogcomponents/author/AssetPicker";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import { Switch } from "@/blogcomponents/ui/Switch";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { siteConfig } from "@/site.config";

const componentOptions = [
  { value: "PlainTextUnit", label: "Text" },
  { value: "DividerUnit", label: "Divider" },
  { value: "CodeUnit", label: "Code" },
  { value: "CodeBlockUnit", label: "Code Block" },
  { value: "LinkUnit", label: "Link" },
  { value: "ButtonUnit", label: "Button" },
  { value: "ImageMedia", label: "Image" },
  { value: "VideoMedia", label: "Video" },
  { value: "MarkdownUnit", label: "Markdown" },
  { value: "AlertUnit", label: "Alert" },
  { value: "PDFMedia", label: "PDF" },
  { value: "ExperienceComponent", label: "Experience" },
  { value: "Container", label: "Container" },
  { value: "Group", label: "Group" },
  { value: "Mirror", label: "Mirror Existing" }
] as const;

type ComponentType = (typeof componentOptions)[number]["value"];

function buildConfig(type: ComponentType, values: Record<string, string>) {
  let config: Record<string, unknown> = {};
  switch (type) {
    case "PlainTextUnit":
      config = { text: values.text ?? "" };
      break;
    case "DividerUnit":
      config = {};
      break;
    case "CodeUnit":
      config = { code: values.code ?? "" };
      break;
    case "CodeBlockUnit":
      config = { code: values.code ?? "" };
      break;
    case "MarkdownUnit":
      config = { content: values.content ?? "" };
      break;
    case "AlertUnit":
      config = { content: values.content ?? "", variant: "info" };
      break;
    case "LinkUnit":
      config = { label: values.label ?? "Link", url: values.url ?? "/" };
      break;
    case "ButtonUnit":
      config = { label: values.label ?? "Button", url: values.url ?? "/" };
      break;
    case "ImageMedia":
      config = { src: values.src ?? "", alt: values.alt ?? "" };
      break;
    case "VideoMedia":
      config = { src: values.src ?? "", autoplay: values.autoplay === "true" };
      break;
    case "PDFMedia":
      config = { src: values.src ?? "", title: values.title ?? "" };
      break;
    case "ExperienceComponent":
      config = {
        position: values.position ?? "",
        company: values.company ?? "",
        start_date: values.start_date ?? "",
        end_date: values.end_date ?? "",
        image: values.image ?? "",
        content: values.content ?? ""
      };
      break;
    case "Container":
      config = { child_node_id: null, name: values.name ?? "" };
      break;
    case "Group": {
      config = {
        child_node_id: null
      };
      // Optional name
      if (values.name) {
        config.name = values.name;
      }
      break;
    }
    case "Mirror":
      config = {};
      break;
    default:
      config = {};
  }

  const useAI = values.useAI === "true";
  if (useAI) {
    config.useAI = true;
    config.aiPrompt = values.aiPrompt ?? "";
  }

  return config;
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
  const [type, setType] = useState<ComponentType>("PlainTextUnit");
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [relativeUrl, setRelativeUrl] = useState("");
  const [linkType, setLinkType] = useState<"internal" | "external">("internal");
  const [views, setViews] = useState<{ node_id: number | null; config: { path?: string; title?: string; name?: string } }[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<number | null>(null);
  const [anchors, setAnchors] = useState<{ hash: string; title: string }[]>([]);
  const [selectedAnchorHash, setSelectedAnchorHash] = useState<string | null>(null);
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
  const aiEnabled = values.useAI === "true";
  const showAiControls = type !== "Mirror";

  const fields = useMemo(() => {
    switch (type) {
      case "PlainTextUnit":
        return [{ key: "text", label: "Text", placeholder: "Content" }];
      case "DividerUnit":
        return [];
      case "MarkdownUnit":
      case "AlertUnit":
        return [{ key: "content", label: "Content", placeholder: "Markdown or alert content" }];
      case "CodeUnit":
      case "CodeBlockUnit":
        return [{ key: "code", label: "Code", placeholder: "// your code" }];
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
      case "Container":
      case "Group":
        return [];
      case "Mirror":
        return [];
      default:
        return [];
    }
  }, [type]);

  const isLinkableComponent = useCallback((componentType: string) => {
    return componentType !== "Container" && componentType !== "Group";
  }, []);

  const getAnchorLabel = useCallback((componentType: string, config: Record<string, unknown>) => {
    switch (componentType) {
      case "PlainTextUnit":
        return String(config.text ?? "Text");
      case "DividerUnit":
        return "Divider";
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

  const loadAnchors = useCallback(async (viewNodeId: number) => {
    try {
      const resolved = await apiFetch<{ component: { type: string }; config: Record<string, unknown>; node: { node_id: number }; children: any[] }>(
        `/nodes/${viewNodeId}/resolved`
      );
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
          const label = String(current.config?.name ?? "Group");
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
      setSelectedAnchorHash(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load anchors");
    }
  }, [getAnchorLabel, isLinkableComponent]);

  const loadViews = useCallback(async () => {
    try {
      const response = await apiFetch<{ node_id: number | null; config: { path?: string; title?: string; name?: string } }[]>("/views");
      setViews(response);
        if (!selectedViewId) {
          const first = response.find((view) => view.node_id !== null);
          setSelectedViewId(first?.node_id ?? null);
          if (first?.node_id) {
            loadAnchors(first.node_id);
          }
        }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load views");
    }
  }, [selectedViewId, loadAnchors]);

  const extractMirrorLabel = useCallback((componentType: string, config: Record<string, unknown>) => {
    if (componentType === "Group") {
      return String((config as { name?: string }).name ?? "Group");
    }
    if (componentType === "Container") {
      return String((config as { name?: string; title?: string }).name ?? (config as { title?: string }).title ?? "Container");
    }
    switch (componentType) {
      case "PlainTextUnit":
        return String(config.text ?? "Text");
      case "DividerUnit":
        return "Divider";
      case "CodeUnit":
        return String(config.code ?? "Code").slice(0, 60);
      case "CodeBlockUnit":
        return String(config.code ?? "Code block").slice(0, 60);
      case "MarkdownUnit":
        return String(config.content ?? "Markdown").slice(0, 60);
      case "AlertUnit":
        return String(config.content ?? "Alert").slice(0, 60);
      case "LinkUnit":
        return String(config.label ?? "Link");
      case "ButtonUnit":
        return String(config.label ?? "Button");
      case "ImageMedia":
      case "VideoMedia":
      case "PDFMedia":
        return String(config.src ?? "Media");
      case "ExperienceComponent":
        return `${String(config.position ?? "Role")} @ ${String(config.company ?? "")}`.trim();
      default:
        return componentType;
    }
  }, []);

  const extractMirrorPreview = useCallback(
    (componentType: string, config: Record<string, unknown>, childCount: number) => {
      if (componentType === "Container" || componentType === "Group") {
        return `${childCount} child component${childCount === 1 ? "" : "s"}`;
      }
      switch (componentType) {
        case "PlainTextUnit":
          return String(config.text ?? "").slice(0, 120);
        case "DividerUnit":
          return "Divider";
        case "MarkdownUnit":
        case "AlertUnit":
          return String(config.content ?? "").slice(0, 120);
        case "CodeUnit":
        case "CodeBlockUnit":
          return String(config.code ?? "").slice(0, 120);
        case "LinkUnit":
          return String(config.url ?? "");
        case "ButtonUnit":
          return String(config.url ?? "");
        case "ImageMedia":
        case "VideoMedia":
        case "PDFMedia":
          return String(config.src ?? "");
        case "ExperienceComponent":
          return String(config.content ?? "").slice(0, 120);
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
        if (type && type !== "Container") {
          const childCount = current.children?.length ?? 0;
          const preview = extractMirrorPreview(type, current.config ?? {}, childCount);
          const previewSrc = type === "ImageMedia" ? String(current.config?.src ?? "") : undefined;
          const displayType = type;
          items.push({
            ref_id: current.reference?.ref_id ?? current.node.node_id,
            comp_id: current.component.comp_id,
            type: displayType,
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
    if ((type === "LinkUnit" || type === "ButtonUnit") && linkType === "internal" && views.length === 0) {
      loadViews();
    }
    if (type === "Mirror" && mirrorViews.length === 0) {
      loadMirrorViews();
    }
    if (type !== "LinkUnit" && type !== "ButtonUnit") {
      setLinkType("internal");
      setExternalUrl("");
      setSelectedAnchorHash(null);
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
      if (type === "LinkUnit" || type === "ButtonUnit") {
        if (linkType === "external") {
          nextValues.url = externalUrl.trim();
        } else {
          const view = views.find((item) => item.node_id === selectedViewId);
          const basePath = view?.config.path ?? "/";
          const hash = selectedAnchorHash ? `#${selectedAnchorHash}` : "";
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
              ) : (type === "CodeUnit" || type === "CodeBlockUnit") && field.key === "code" ? (
                <textarea
                  className="code-input"
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
        {type === "Group" ? (
          <label>
            <span>Name</span>
            <input
              value={values.name ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Optional group name"
            />
          </label>
        ) : null}
        {type === "Container" ? (
          <label>
            <span>Name</span>
            <input
              value={values.name ?? ""}
              onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Optional container name"
            />
          </label>
        ) : null}
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
        {type === "LinkUnit" || type === "ButtonUnit" ? (
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
                      loadAnchors(next);
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
        {showAiControls ? (
          <div className="ai-controls">
            <div className="toggle-row">
              <span>Use AI</span>
              <Switch
                checked={aiEnabled}
                onCheckedChange={(checked) =>
                  setValues((prev) => ({
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
                  value={values.aiPrompt ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, aiPrompt: event.target.value }))
                  }
                  placeholder="Describe the content to generate"
                />
              </label>
            ) : null}
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
