"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { siteConfig } from "@/site.config";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { DeleteIcon, DownloadIcon } from "@/components/ui/icons";
import Image from "next/image";

interface AssetItem {
  name: string;
  src: string;
  mime: string;
  size: number;
}

interface AssetUsage {
  count: number;
  views: string[];
}

export function MediaPanel() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [usage, setUsage] = useState<Record<string, AssetUsage>>({});
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AssetItem | null>(null);
  const toast = useToast();

  async function refresh() {
    try {
      const [list, usageMap] = await Promise.all([
        apiFetch<AssetItem[]>("/assets"),
        apiFetch<Record<string, AssetUsage>>("/assets/usage")
      ]);
      setAssets(list);
      setUsage(usageMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
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
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${siteConfig.authorApiBaseUrl}/upload-asset`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Upload failed");
      }
      await refresh();
      toast.push("Asset uploaded", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      toast.push("Upload failed", "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(name: string) {
    try {
      await apiFetch(`/assets/${encodeURIComponent(name)}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((item) => item.name !== name));
      toast.push("Asset deleted", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete asset");
      toast.push("Delete failed", "error");
    }
  }

  function copyUrl(src: string) {
    navigator.clipboard?.writeText(src);
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Media</h2>
        <p>Upload and manage assets.</p>
      </div>
      <label className="section-card">
        <span>Upload file</span>
        <input type="file" onChange={handleUpload} />
        <span className="muted">Images, PDFs, and videos are supported.</span>
      </label>
      {isUploading ? <p>Uploading...</p> : null}
      {error ? <div className="alert">{error}</div> : null}
      <div className="media-grid">
        {assets.map((asset) => (
          <div key={asset.name} className="media-card">
            {usage[asset.src] ? (
              <span className="badge secondary">Used {usage[asset.src].count}x</span>
            ) : (
              <span className="badge">Unused</span>
            )}
            <div className="media-preview">
              {asset.mime.startsWith("image/") ? (
                <Image
                  src={asset.src}
                  alt={asset.name}
                  width={320}
                  height={200}
                  unoptimized
                  style={{ width: "100%", height: "auto" }}
                />
              ) : (
                <div className="media-placeholder">
                  <strong>{asset.mime.split("/")[1] ?? "file"}</strong>
                  <span>{asset.name}</span>
                </div>
              )}
            </div>
            <div className="media-meta">
              <span>{asset.name}</span>
              <span className="muted">{Math.round(asset.size / 1024)} KB</span>
              {usage[asset.src]?.views?.length ? (
                <span className="muted">Used in: {usage[asset.src].views.join(", ")}</span>
              ) : null}
            </div>
            <div className="action-bar">
              <div className="action-group">
                <button className="button ghost small" type="button" onClick={() => copyUrl(asset.src)}>
                  Copy URL
                </button>
                <a className="button ghost small" href={asset.src} download>
                  <span className="icon-label">
                    <DownloadIcon size={14} aria-hidden />
                    Download
                  </span>
                </a>
              </div>
              <div className="action-group action-group--right">
                <button
                  className="button danger small icon-only"
                  type="button"
                  onClick={() => setPendingDelete(asset)}
                  aria-label="Delete"
                  title="Delete"
                >
                  <DeleteIcon size={20} strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete asset"
        description={pendingDelete ? `Delete ${pendingDelete.name}?` : undefined}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            handleDelete(pendingDelete.name);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
