"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/lib/api/client";

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

export function AssetPicker({
  label,
  onSelect,
  allowedPrefixes
}: {
  label: string;
  onSelect: (src: string) => void;
  allowedPrefixes: string[];
}) {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "size">("name");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video" | "pdf" | "other">("all");
  const [usage, setUsage] = useState<Record<string, AssetUsage>>({});

  const availableTypes = useMemo(() => {
    const options: Array<{ value: typeof typeFilter; label: string }> = [{ value: "all", label: "All" }];
    if (allowedPrefixes.some((prefix) => prefix.startsWith("image/"))) {
      options.push({ value: "image", label: "Images" });
    }
    if (allowedPrefixes.some((prefix) => prefix.startsWith("video/"))) {
      options.push({ value: "video", label: "Video" });
    }
    if (allowedPrefixes.some((prefix) => prefix === "application/pdf")) {
      options.push({ value: "pdf", label: "PDF" });
    }
    options.push({ value: "other", label: "Other" });
    return options;
  }, [allowedPrefixes]);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let items = assets.filter((asset) =>
      asset.name.toLowerCase().includes(normalizedQuery)
    );

    if (typeFilter !== "all") {
      items = items.filter((asset) => {
        if (typeFilter === "image") return asset.mime.startsWith("image/");
        if (typeFilter === "video") return asset.mime.startsWith("video/");
        if (typeFilter === "pdf") return asset.mime === "application/pdf";
        return !asset.mime.startsWith("image/") && !asset.mime.startsWith("video/") && asset.mime !== "application/pdf";
      });
    }

    return [...items].sort((a, b) => {
      if (sortBy === "size") {
        return b.size - a.size;
      }
      return a.name.localeCompare(b.name);
    });
  }, [assets, query, sortBy, typeFilter]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      apiFetch<AssetItem[]>("/assets"),
      apiFetch<Record<string, AssetUsage>>("/assets/usage")
    ])
      .then(([data, usageMap]) => {
        setAssets(
          data.filter((asset) =>
            allowedPrefixes.some((prefix) => asset.mime.startsWith(prefix))
          )
        );
        setUsage(usageMap);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load assets"));
  }, [open, allowedPrefixes]);

  return (
    <div className="asset-picker">
      <button className="button ghost" type="button" onClick={() => setOpen((prev) => !prev)}>
        {open ? "Close" : label}
      </button>
      {open ? (
        <>
          <div className="form-grid">
            <label>
              <span>Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search assets"
              />
            </label>
            <label>
              <span>Type</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
                {availableTypes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
            </label>
          </div>
          <div className="media-grid">
            {filteredAssets.map((asset) => (
                <button
                  key={asset.name}
                  type="button"
                  className="media-card"
                  onClick={() => {
                    onSelect(asset.src);
                    setOpen(false);
                  }}
                >
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
                  </div>
                </button>
              ))}
            {!filteredAssets.length ? <p className="muted">No assets available.</p> : null}
          </div>
        </>
      ) : null}
      {error ? <div className="alert">{error}</div> : null}
    </div>
  );
}
