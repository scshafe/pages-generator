"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { EditableList } from "@/components/settings/EditableList";
import type { FooterItem, MenuItem } from "@/lib/content/types";

export function NavigationPanel() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [footer, setFooter] = useState<FooterItem[]>([]);
  const [menuLabel, setMenuLabel] = useState("");
  const [menuHref, setMenuHref] = useState("");
  const [footerLabel, setFooterLabel] = useState("");
  const [footerHref, setFooterHref] = useState("");
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

  async function addMenu(event: React.FormEvent) {
    event.preventDefault();
    if (!menuLabel.trim() || !menuHref.trim()) {
      setError("Label and href are required.");
      toast.push("Label and href are required", "error");
      return;
    }
    const created = await apiFetch<MenuItem>("/menu", {
      method: "POST",
      body: JSON.stringify({ label: menuLabel.trim(), href: menuHref.trim() })
    });
    setMenu((prev) => [created, ...prev]);
    setMenuLabel("");
    setMenuHref("");
    toast.push("Menu item added", "success");
  }

  async function addFooter(event: React.FormEvent) {
    event.preventDefault();
    if (!footerLabel.trim() || !footerHref.trim()) {
      setError("Label and href are required.");
      toast.push("Label and href are required", "error");
      return;
    }
    const created = await apiFetch<FooterItem>("/footer", {
      method: "POST",
      body: JSON.stringify({ label: footerLabel.trim(), href: footerHref.trim() })
    });
    setFooter((prev) => [created, ...prev]);
    setFooterLabel("");
    setFooterHref("");
    toast.push("Footer item added", "success");
  }

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
        <div className="section-card">
          <h3>Header Menu</h3>
          <form className="form-row" onSubmit={addMenu}>
            <input
              value={menuLabel}
              onChange={(event) => setMenuLabel(event.target.value)}
              placeholder="Label"
            />
            <input
              value={menuHref}
              onChange={(event) => setMenuHref(event.target.value)}
              placeholder="/about"
            />
            <button className="button" type="submit">Add</button>
          </form>
          <EditableList
            title="Header Menu Items"
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

        <div className="section-card">
          <h3>Footer</h3>
          <form className="form-row" onSubmit={addFooter}>
            <input
              value={footerLabel}
              onChange={(event) => setFooterLabel(event.target.value)}
              placeholder="Label"
            />
            <input
              value={footerHref}
              onChange={(event) => setFooterHref(event.target.value)}
              placeholder="/privacy"
            />
            <button className="button" type="submit">Add</button>
          </form>
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
