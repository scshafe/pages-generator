"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api/client";
import { siteConfig } from "@/site.config";
import type { SiteSettings } from "@/lib/content/types";
import { useToast } from "@/components/ui/ToastProvider";

const defaultSiteSettings: SiteSettings = {
  site_name: "",
  tagline: "",
  site_url: "",
  description: "",
  keywords: "",
  author: "",
  language: "en",
  theme_color: "#1f3b56",
  twitter_handle: "",
  social_image_url: "",
  robots: "index,follow",
  favicon_src: ""
};

export function SitePanel() {
  const [form, setForm] = useState<SiteSettings>(defaultSiteSettings);
  const [savedSnapshot, setSavedSnapshot] = useState<SiteSettings>(defaultSiteSettings);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const isAuthor = process.env.NEXT_PUBLIC_BUILD_MODE === "author";
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const faviconUrl = useMemo(() => form.favicon_src, [form.favicon_src]);

  const loadSettings = useCallback(async () => {
    if (!isAuthor) return;
    try {
      const response = await apiFetch<SiteSettings>("/site");
      const next = { ...defaultSiteSettings, ...response };
      setForm(next);
      setSavedSnapshot(next);
      setSaveStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load site settings");
    } finally {
      hasLoadedRef.current = true;
    }
  }, [isAuthor]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const hasChanges = useMemo(() => {
    const keys = Object.keys(defaultSiteSettings) as (keyof SiteSettings)[];
    return keys.some((key) => form[key] !== savedSnapshot[key]);
  }, [form, savedSnapshot]);

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
        const updated = await apiFetch<SiteSettings>("/site", {
          method: "PUT",
          body: JSON.stringify(form)
        });
        const next = { ...defaultSiteSettings, ...updated };
        setForm(next);
        setSavedSnapshot(next);
        setSaveStatus("saved");
        setError(null);
        window.setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save site settings");
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

  const uploadImage = useCallback(
    async (file: File, field: "favicon_src" | "social_image_url", successLabel: string) => {
      if (!isAuthor) return;
      try {
        setIsUploading(true);
        setError(null);
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
        const result = (await response.json()) as { src: string };
        setForm((prev) => ({ ...prev, [field]: result.src }));
        toast.push(`${successLabel} uploaded`, "success");
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload ${successLabel.toLowerCase()}`);
        toast.push("Upload failed", "error");
      } finally {
        setIsUploading(false);
      }
    },
    [isAuthor, toast]
  );

  const handleFaviconUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isAuthor) return;
      const file = event.target.files?.[0];
      if (!file) return;
      await uploadImage(file, "favicon_src", "Favicon");
    },
    [isAuthor, uploadImage]
  );

  const handleSocialUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isAuthor) return;
      const file = event.target.files?.[0];
      if (!file) return;
      await uploadImage(file, "social_image_url", "Social image");
    },
    [isAuthor, uploadImage]
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Site</h2>
        <p>Identity and metadata for your site.</p>
      </div>
      <div className="section-card">
        <div className="form-grid">
          <label>
            <span>Site Name</span>
            <input
              value={form.site_name}
              onChange={(event) => setForm((prev) => ({ ...prev, site_name: event.target.value }))}
              placeholder="Studio Notebook"
            />
          </label>
          <label>
            <span>Tagline</span>
            <input
              value={form.tagline}
              onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
              placeholder="Thoughts, notes, and experiments"
            />
          </label>
          <label>
            <span>Site URL</span>
            <input
              value={form.site_url}
              onChange={(event) => setForm((prev) => ({ ...prev, site_url: event.target.value }))}
              placeholder="https://example.com"
            />
          </label>
          <label>
            <span>Meta Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="A short description for search and previews."
            />
          </label>
          <label>
            <span>Keywords</span>
            <input
              value={form.keywords}
              onChange={(event) => setForm((prev) => ({ ...prev, keywords: event.target.value }))}
              placeholder="design, studio, portfolio"
            />
          </label>
          <label>
            <span>Author</span>
            <input
              value={form.author}
              onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
              placeholder="Your name or studio"
            />
          </label>
          <label>
            <span>Default Language</span>
            <input
              value={form.language}
              onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
              placeholder="en"
            />
          </label>
          <label>
            <span>Theme Color</span>
            <input
              type="color"
              value={form.theme_color}
              onChange={(event) => setForm((prev) => ({ ...prev, theme_color: event.target.value }))}
            />
          </label>
          <label>
            <span>Twitter Handle</span>
            <input
              value={form.twitter_handle}
              onChange={(event) => setForm((prev) => ({ ...prev, twitter_handle: event.target.value }))}
              placeholder="@studio"
            />
          </label>
          <label>
            <span>Social Image URL</span>
            <input
              value={form.social_image_url}
              onChange={(event) => setForm((prev) => ({ ...prev, social_image_url: event.target.value }))}
              placeholder="https://example.com/og.jpg"
            />
          </label>
          <label>
            <span>Social Image Upload</span>
            <input type="file" accept="image/*" onChange={handleSocialUpload} />
            <span className="form-hint">Recommended 1200x630 for link previews.</span>
          </label>
          <label>
            <span>Robots</span>
            <select
              value={form.robots}
              onChange={(event) => setForm((prev) => ({ ...prev, robots: event.target.value }))}
            >
              <option value="index,follow">index,follow</option>
              <option value="noindex,follow">noindex,follow</option>
              <option value="index,nofollow">index,nofollow</option>
              <option value="noindex,nofollow">noindex,nofollow</option>
            </select>
          </label>
          <label>
            <span>Favicon</span>
            <input type="file" accept="image/*" onChange={handleFaviconUpload} />
            <span className="form-hint">PNG or SVG, 32x32 recommended.</span>
          </label>
          {isUploading ? <span className="form-hint">Uploading favicon...</span> : null}
          {faviconUrl ? (
            <div className="image-preview favicon-preview">
              <Image src={faviconUrl} alt="Favicon preview" width={64} height={64} unoptimized />
            </div>
          ) : null}
          {form.social_image_url ? (
            <div className="image-preview">
              <Image
                src={form.social_image_url}
                alt="Social image preview"
                width={640}
                height={336}
                unoptimized
                style={{ width: "100%", height: "auto" }}
              />
            </div>
          ) : null}
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
    </div>
  );
}
