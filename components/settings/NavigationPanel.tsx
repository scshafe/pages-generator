"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { EditableList } from "@/components/settings/EditableList";
import type { FooterItem, MenuItem } from "@/lib/content/types";

type NavItemType = "" | "internal" | "external" | "special";

type ViewOption = {
  node_id: number | null;
  config: { path?: string; title?: string; name?: string };
};

const specialOptions = [
  { value: "home", label: "Home", href: "/" },
  { value: "settings", label: "Settings", href: "/settings" },
  { value: "feed", label: "RSS Feed", href: "/feed.xml" }
];

function getViewLabel(view: ViewOption) {
  return view.config.title ?? view.config.name ?? view.config.path ?? "Untitled";
}

function NavItemCreator({
  title,
  onCreate,
  views,
  ensureViews,
  viewsLoading
}: {
  title: string;
  onCreate: (item: { label: string; href: string; view_node_id?: number | null }) => Promise<void>;
  views: ViewOption[];
  ensureViews: () => void;
  viewsLoading: boolean;
}) {
  const [type, setType] = useState<NavItemType>("");
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [selectedViewId, setSelectedViewId] = useState<number | null>(null);
  const [specialKey, setSpecialKey] = useState("");

  useEffect(() => {
    if (type === "internal") {
      ensureViews();
    }
  }, [type, ensureViews]);

  const resolvedView = useMemo(() => {
    if (!selectedViewId) return null;
    return views.find((view) => view.node_id === selectedViewId) ?? null;
  }, [selectedViewId, views]);

  const resolvedSpecial = useMemo(() => {
    return specialOptions.find((option) => option.value === specialKey) ?? null;
  }, [specialKey]);

  const canSave =
    (type === "internal" && Boolean(resolvedView)) ||
    (type === "external" && Boolean(label.trim() && href.trim())) ||
    (type === "special" && Boolean(resolvedSpecial));

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    if (type === "internal" && resolvedView) {
      await onCreate({
        label: getViewLabel(resolvedView),
        href: resolvedView.config.path ?? "/",
        view_node_id: resolvedView.node_id
      });
    }
    if (type === "external") {
      await onCreate({ label: label.trim(), href: href.trim() });
    }
    if (type === "special" && resolvedSpecial) {
      await onCreate({ label: resolvedSpecial.label, href: resolvedSpecial.href });
    }
    setType("");
    setLabel("");
    setHref("");
    setSelectedViewId(null);
    setSpecialKey("");
  }, [canSave, type, resolvedView, resolvedSpecial, onCreate, label, href]);

  return (
    <div className="section-card">
      <h3>{title}</h3>
      <div className="form-grid">
        <select
          value={type}
          onChange={(event) => setType(event.target.value as NavItemType)}
          aria-label={`${title} item type`}
        >
          <option value="">Select type</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
          <option value="special">Special</option>
        </select>

        {type === "internal" ? (
          <div className="form-grid">
            <select
              value={selectedViewId ?? ""}
              onChange={(event) => setSelectedViewId(Number(event.target.value))}
              disabled={viewsLoading || views.length === 0}
              aria-label={`${title} view`}
            >
              <option value="">Select a view</option>
              {views
                .filter((view) => view.node_id !== null)
                .map((view) => (
                  <option key={view.node_id ?? view.config.path ?? "unknown"} value={view.node_id ?? ""}>
                    {getViewLabel(view)}
                  </option>
                ))}
            </select>
            {viewsLoading ? <span className="form-hint">Loading views...</span> : null}
          </div>
        ) : null}

        {type === "external" ? (
          <div className="form-row">
            <label>
              <span>Label</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Label" />
            </label>
            <label>
              <span>URL</span>
              <input value={href} onChange={(event) => setHref(event.target.value)} placeholder="https://" />
            </label>
          </div>
        ) : null}

        {type === "special" ? (
          <select
            value={specialKey}
            onChange={(event) => setSpecialKey(event.target.value)}
            aria-label={`${title} special link`}
          >
            <option value="">Select special</option>
            {specialOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}

        {canSave ? (
          <div className="action-bar">
            <div className="action-group action-group--right">
              <button className="button" type="button" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function NavigationPanel() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [footer, setFooter] = useState<FooterItem[]>([]);
  const [views, setViews] = useState<ViewOption[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { type: "menu"; item: MenuItem }
    | { type: "footer"; item: FooterItem }
    | null
  >(null);
  const toast = useToast();

  async function refresh() {
    const [menuItems, footerItems] = await Promise.all([
      apiFetch<MenuItem[]>("/menu"),
      apiFetch<FooterItem[]>("/footer")
    ]);
    setMenu(menuItems);
    setFooter(footerItems);
  }

  useEffect(() => {
    refresh().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load navigation");
    });
  }, []);

  const ensureViews = useCallback(async () => {
    if (views.length || viewsLoading) return;
    setViewsLoading(true);
    try {
      const response = await apiFetch<ViewOption[]>("/views");
      setViews(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load views");
    } finally {
      setViewsLoading(false);
    }
  }, [views.length, viewsLoading]);

  const createMenuItem = useCallback(
    async (payload: { label: string; href: string; view_node_id?: number | null }) => {
      try {
        const created = await apiFetch<MenuItem>("/menu", {
          method: "POST",
          body: JSON.stringify({
            label: payload.label,
            href: payload.href,
            view_node_id: payload.view_node_id ?? null
          })
        });
        setMenu((prev) => [created, ...prev]);
        toast.push("Menu item added", "success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add menu item");
        toast.push("Failed to add menu item", "error");
      }
    },
    [toast]
  );

  const createFooterItem = useCallback(
    async (payload: { label: string; href: string; view_node_id?: number | null }) => {
      try {
        const created = await apiFetch<FooterItem>("/footer", {
          method: "POST",
          body: JSON.stringify({
            label: payload.label,
            href: payload.href,
            view_node_id: payload.view_node_id ?? null
          })
        });
        setFooter((prev) => [created, ...prev]);
        toast.push("Footer item added", "success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add footer item");
        toast.push("Failed to add footer item", "error");
      }
    },
    [toast]
  );

  async function deleteMenu(menu_id: number) {
    await apiFetch(`/menu/${menu_id}`, { method: "DELETE" });
    setMenu((prev) => prev.filter((item) => item.menu_id !== menu_id));
    toast.push("Menu item deleted", "success");
  }

  async function deleteFooter(footer_id: number) {
    await apiFetch(`/footer/${footer_id}`, { method: "DELETE" });
    setFooter((prev) => prev.filter((item) => item.footer_id !== footer_id));
    toast.push("Footer item deleted", "success");
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Navigation</h2>
        <p>Add menu and footer items.</p>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="section">
        <div className="navigation-grid">
          <div className="nav-column">
            <NavItemCreator
              title="Header"
              onCreate={createMenuItem}
              views={views}
              ensureViews={ensureViews}
              viewsLoading={viewsLoading}
            />
            <EditableList
              title="Header Items"
              items={menu.map((item) => ({
                id: item.menu_id,
                label: item.label,
                href: item.href
              }))}
              validate={(item) => {
                if (!item.label.trim() || !item.href.trim()) {
                  return "Label and href are required.";
                }
                return null;
              }}
              onSave={async (item) => {
                await apiFetch(`/menu/${item.id}`, {
                  method: "PUT",
                  body: JSON.stringify({ label: item.label, href: item.href })
                });
                setMenu((prev) =>
                  prev.map((entry) =>
                    entry.menu_id === item.id ? { ...entry, label: item.label, href: item.href } : entry
                  )
                );
                toast.push("Menu item saved", "success");
              }}
              onDelete={async (item) => {
                setPendingDelete({ type: "menu", item: { ...item, menu_id: item.id } as MenuItem });
              }}
            />
          </div>
          <div className="nav-column">
            <NavItemCreator
              title="Footer"
              onCreate={createFooterItem}
              views={views}
              ensureViews={ensureViews}
              viewsLoading={viewsLoading}
            />
            <EditableList
              title="Footer Items"
              items={footer.map((item) => ({
                id: item.footer_id,
                label: item.label,
                href: item.href
              }))}
              validate={(item) => {
                if (!item.label.trim() || !item.href.trim()) {
                  return "Label and href are required.";
                }
                return null;
              }}
              onSave={async (item) => {
                await apiFetch(`/footer/${item.id}`, {
                  method: "PUT",
                  body: JSON.stringify({ label: item.label, href: item.href })
                });
                setFooter((prev) =>
                  prev.map((entry) =>
                    entry.footer_id === item.id ? { ...entry, label: item.label, href: item.href } : entry
                  )
                );
                toast.push("Footer item saved", "success");
              }}
              onDelete={async (item) => {
                setPendingDelete({ type: "footer", item: { ...item, footer_id: item.id } as FooterItem });
              }}
            />
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete navigation item"
        description={
          pendingDelete
            ? `Delete ${pendingDelete.item.label}?`
            : undefined
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.type === "menu") {
            deleteMenu(pendingDelete.item.menu_id);
          } else {
            deleteFooter(pendingDelete.item.footer_id);
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
