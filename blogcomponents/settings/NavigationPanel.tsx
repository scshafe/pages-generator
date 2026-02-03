"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { apiFetch } from "@/lib/api/client";
import { ConfirmDialog } from "@/blogcomponents/ui/ConfirmDialog";
import { useToast } from "@/blogcomponents/ui/ToastProvider";
import { ObjectActionDropdown } from "@/blogcomponents/ui/ObjectActionDropdown";
import { CreationCard } from "@/blogcomponents/ui/CreationCard";
import type { CreationStage, CreationValueState } from "@/blogcomponents/ui/CreationCard";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FooterItem, MenuItem } from "@/lib/content/types";
import { cn } from "@/lib/utils";

type NavSection = "header" | "footer";

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

function getNavDataId(section: NavSection, item: MenuItem | FooterItem) {
  return section === "header" ? `menu-${(item as MenuItem).menu_id}` : `footer-${(item as FooterItem).footer_id}`;
}

function sortByLayout<T extends MenuItem | FooterItem>(
  items: T[],
  orderedIds: string[],
  section: NavSection
) {
  if (!orderedIds.length) return items;
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  return [...items]
    .map((item, index) => ({
      item,
      index,
      order: orderMap.get(getNavDataId(section, item))
    }))
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      if (a.item.order !== undefined && b.item.order !== undefined) return a.item.order - b.item.order;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

export function NavigationPanel() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [footer, setFooter] = useState<FooterItem[]>([]);
  const [views, setViews] = useState<ViewOption[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>("header");
  const [selectedItem, setSelectedItem] = useState<
    | { section: NavSection; item: MenuItem | FooterItem }
    | null
  >(null);
  const [hoveredItem, setHoveredItem] = useState<{ section: NavSection; id: string } | null>(null);
  const [dragState, setDragState] = useState<{ section: NavSection; id: string } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [manualOrder, setManualOrder] = useState<{ header: boolean; footer: boolean }>({
    header: false,
    footer: false
  });
  const [isReordering, setIsReordering] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [createValues, setCreateValues] = useState<Record<string, CreationValueState>>({});
  const [createVersion, setCreateVersion] = useState(0);
  const [orderedMenuIds, setOrderedMenuIds] = useState<string[]>([]);
  const [orderedFooterIds, setOrderedFooterIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<
    | { section: "header"; item: MenuItem }
    | { section: "footer"; item: FooterItem }
    | null
  >(null);
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [menuItems, footerItems] = await Promise.all([
          apiFetch<MenuItem[]>("/menu"),
          apiFetch<FooterItem[]>("/footer")
        ]);
        setMenu(menuItems);
        setFooter(footerItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load navigation");
      }
    };
    load();
  }, []);

  useEffect(() => {
    setSelectedItem(null);
    setEditorMode("create");
    setCreateValues({});
    setCreateVersion((prev) => prev + 1);
  }, [activeSection]);

  useEffect(() => {
    const measure = () => {
      const headerItems = Array.from(
        document.querySelectorAll(".header [data-nav-id^='menu-']")
      ) as HTMLElement[];
      const footerItems = Array.from(
        document.querySelectorAll(".footer [data-nav-id^='footer-']")
      ) as HTMLElement[];
      const sortByPosition = (items: HTMLElement[]) =>
        items
          .map((item) => {
            const rect = item.getBoundingClientRect();
            return { id: item.getAttribute("data-nav-id") ?? "", top: rect.top, left: rect.left };
          })
          .filter((item) => item.id)
          .sort((a, b) => (a.top === b.top ? a.left - b.left : a.top - b.top))
          .map((item) => item.id);
      if (!manualOrder.header) {
        setOrderedMenuIds(sortByPosition(headerItems));
      }
      if (!manualOrder.footer) {
        setOrderedFooterIds(sortByPosition(footerItems));
      }
    };
    const frame = window.requestAnimationFrame(measure);
    const handleResize = () => window.requestAnimationFrame(measure);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(frame);
    };
  }, [footer, manualOrder.footer, manualOrder.header, menu]);

  useEffect(() => {
    const header = document.querySelector(".header");
    const footerEl = document.querySelector(".footer");
    const clearHighlights = () => {
      header?.classList.remove("nav-highlight-target");
      footerEl?.classList.remove("nav-highlight-target");
      document.querySelectorAll(".nav-highlight-item").forEach((item) => {
        item.classList.remove("nav-highlight-item");
      });
    };

    const applyHighlights = () => {
      clearHighlights();
      const activeSelection =
        editorMode === "edit" && selectedItem && selectedItem.section === activeSection
          ? selectedItem
          : null;
      if (activeSection === "header") {
        if (activeSelection) {
          const id = getNavDataId("header", activeSelection.item);
          const target = document.querySelector(`[data-nav-id='${id}']`);
          target?.classList.add("nav-highlight-item");
        } else {
          header?.classList.add("nav-highlight-target");
        }
        return;
      }
      if (activeSelection) {
        const id = getNavDataId("footer", activeSelection.item);
        const target = document.querySelector(`[data-nav-id='${id}']`);
        target?.classList.add("nav-highlight-item");
      } else {
        footerEl?.classList.add("nav-highlight-target");
      }
    };

    const frame = window.requestAnimationFrame(applyHighlights);
    return () => {
      window.cancelAnimationFrame(frame);
      clearHighlights();
    };
  }, [activeSection, selectedItem, menu, footer]);

  useEffect(() => {
    const clearHover = () => {
      document.querySelectorAll(".nav-hover-item").forEach((item) => {
        item.classList.remove("nav-hover-item");
      });
    };
    clearHover();
    if (!hoveredItem) return;
    const target = document.querySelector(`[data-nav-id='${hoveredItem.id}']`);
    target?.classList.add("nav-hover-item");
    return () => {
      target?.classList.remove("nav-hover-item");
    };
  }, [hoveredItem]);

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

  useEffect(() => {
    if (createValues.type === "internal") {
      ensureViews();
    }
  }, [createValues.type, ensureViews]);

  const viewOptions = useMemo(
    () =>
      views
        .filter((view) => view.node_id !== null)
        .map((view) => ({
          label: getViewLabel(view),
          value: String(view.node_id ?? "")
        })),
    [views]
  );

  const sortedMenu = useMemo(
    () => sortByLayout(menu, orderedMenuIds, "header"),
    [menu, orderedMenuIds]
  );
  const sortedFooter = useMemo(
    () => sortByLayout(footer, orderedFooterIds, "footer"),
    [footer, orderedFooterIds]
  );

  const sectionLabel = activeSection === "header" ? "Header" : "Footer";

  const startCreate = useCallback(() => {
    setEditorMode("create");
    setSelectedItem(null);
    setCreateVersion((prev) => prev + 1);
  }, []);

  const startEdit = useCallback((section: NavSection, item: MenuItem | FooterItem) => {
    setEditorMode("edit");
    setSelectedItem({ section, item });
  }, []);

  const handleCreate = useCallback(async (values: Record<string, CreationValueState>) => {
    const type = String(values.type ?? "");
    if (!type) return;
    try {
      if (type === "internal") {
        const viewId = Number(values.view ?? "");
        const resolvedView = views.find((view) => view.node_id === viewId) ?? null;
        if (!resolvedView) {
          toast.push("Select a view", "error");
          return;
        }
        const payload = {
          label: getViewLabel(resolvedView),
          href: resolvedView.config.path ?? "/",
          view_node_id: resolvedView.node_id
        };
        if (activeSection === "header") {
          const created = await apiFetch<MenuItem>("/menu", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          setMenu((prev) => [created, ...prev]);
        } else {
          const created = await apiFetch<FooterItem>("/footer", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          setFooter((prev) => [created, ...prev]);
        }
      }
      if (type === "external") {
        const label = String(values.label ?? "").trim();
        const href = String(values.href ?? "").trim();
        if (!label || !href) return;
        const payload = { label, href };
        if (activeSection === "header") {
          const created = await apiFetch<MenuItem>("/menu", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          setMenu((prev) => [created, ...prev]);
        } else {
          const created = await apiFetch<FooterItem>("/footer", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          setFooter((prev) => [created, ...prev]);
        }
      }
      if (type === "special") {
        const specialKey = String(values.special ?? "");
        const resolvedSpecial = specialOptions.find((option) => option.value === specialKey) ?? null;
        if (!resolvedSpecial) {
          toast.push("Select a special link", "error");
          return;
        }
        const payload = { label: resolvedSpecial.label, href: resolvedSpecial.href };
        if (activeSection === "header") {
          const created = await apiFetch<MenuItem>("/menu", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          setMenu((prev) => [created, ...prev]);
        } else {
          const created = await apiFetch<FooterItem>("/footer", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          setFooter((prev) => [created, ...prev]);
        }
      }
      toast.push(`${sectionLabel} item added`, "success");
      setCreateVersion((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
      toast.push("Failed to add item", "error");
    }
  }, [activeSection, sectionLabel, toast, views]);

  const handleEditSave = useCallback(async (values: Record<string, CreationValueState>) => {
    if (!selectedItem) return;
    const label = String(values.label ?? "").trim();
    const href = String(values.href ?? "").trim();
    if (!label || !href) return;
    try {
      if (selectedItem.section === "header") {
        const menuItem = selectedItem.item as MenuItem;
        await apiFetch(`/menu/${menuItem.menu_id}`, {
          method: "PUT",
          body: JSON.stringify({ label, href })
        });
        setMenu((prev) =>
          prev.map((entry) =>
            entry.menu_id === menuItem.menu_id ? { ...entry, label, href } : entry
          )
        );
      } else {
        const footerItem = selectedItem.item as FooterItem;
        await apiFetch(`/footer/${footerItem.footer_id}`, {
          method: "PUT",
          body: JSON.stringify({ label, href })
        });
        setFooter((prev) =>
          prev.map((entry) =>
            entry.footer_id === footerItem.footer_id ? { ...entry, label, href } : entry
          )
        );
      }
      setSelectedItem((prev) => (prev ? { ...prev, item: { ...prev.item, label, href } } : prev));
      toast.push("Item saved", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Failed to save item", "error");
    }
  }, [selectedItem, toast]);

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.section === "header") {
        await apiFetch(`/menu/${pendingDelete.item.menu_id}`, { method: "DELETE" });
        setMenu((prev) => prev.filter((item) => item.menu_id !== pendingDelete.item.menu_id));
      } else {
        await apiFetch(`/footer/${pendingDelete.item.footer_id}`, { method: "DELETE" });
        setFooter((prev) => prev.filter((item) => item.footer_id !== pendingDelete.item.footer_id));
      }
      if (selectedItem && getNavDataId(selectedItem.section, selectedItem.item) === getNavDataId(pendingDelete.section, pendingDelete.item)) {
        setSelectedItem(null);
        setEditorMode("create");
      }
      toast.push("Item deleted", "success");
    } catch (err) {
      toast.push(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setPendingDelete(null);
    }
  }, [pendingDelete, selectedItem, toast]);

  const handleSectionChange = useCallback((value: string) => {
    if (value === "header" || value === "footer") {
      setActiveSection(value);
    }
  }, []);

  const reorderList = <T,>(items: T[], fromIndex: number, toIndex: number) => {
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const getRowId = useCallback((section: NavSection, item: MenuItem | FooterItem) => {
    return getNavDataId(section, item);
  }, []);

  const persistOrder = useCallback(
    async (section: NavSection, nextItems: Array<MenuItem | FooterItem>, previousItems: Array<MenuItem | FooterItem>) => {
      setIsReordering(true);
      try {
        if (section === "header") {
          const updates = (nextItems as MenuItem[]).map((item, index) =>
            apiFetch(`/menu/${item.menu_id}`, {
              method: "PUT",
              body: JSON.stringify({ label: item.label, href: item.href, order: index })
            })
          );
          await Promise.all(updates);
          toast.push("Header order updated", "success");
        } else {
          const updates = (nextItems as FooterItem[]).map((item, index) =>
            apiFetch(`/footer/${item.footer_id}`, {
              method: "PUT",
              body: JSON.stringify({ label: item.label, href: item.href, order: index })
            })
          );
          await Promise.all(updates);
          toast.push("Footer order updated", "success");
        }
      } catch (err) {
        toast.push(err instanceof Error ? err.message : "Failed to reorder", "error");
        if (section === "header") {
          setMenu(previousItems as MenuItem[]);
          setOrderedMenuIds((previousItems as MenuItem[]).map((item) => getRowId("header", item)));
        } else {
          setFooter(previousItems as FooterItem[]);
          setOrderedFooterIds((previousItems as FooterItem[]).map((item) => getRowId("footer", item)));
        }
      } finally {
        setIsReordering(false);
      }
    },
    [getRowId, toast]
  );

  const handleReorder = useCallback(
    async (section: NavSection, fromId: string, toId: string) => {
      if (fromId === toId) return;
      if (section === "header") {
        const items = sortedMenu;
        const previousItems = menu;
        const fromIndex = items.findIndex((item) => getRowId("header", item) === fromId);
        const toIndex = items.findIndex((item) => getRowId("header", item) === toId);
        if (fromIndex < 0 || toIndex < 0) return;
        const reordered = reorderList(items, fromIndex, toIndex).map((item, index) => ({
          ...item,
          order: index
        }));
        setMenu(reordered);
        setOrderedMenuIds(reordered.map((item) => getRowId("header", item)));
        setManualOrder((prev) => ({ ...prev, header: true }));
        await persistOrder("header", reordered, previousItems);
        return;
      }
      const items = sortedFooter;
      const previousItems = footer;
      const fromIndex = items.findIndex((item) => getRowId("footer", item) === fromId);
      const toIndex = items.findIndex((item) => getRowId("footer", item) === toId);
      if (fromIndex < 0 || toIndex < 0) return;
      const reordered = reorderList(items, fromIndex, toIndex).map((item, index) => ({
        ...item,
        order: index
      }));
      setFooter(reordered);
      setOrderedFooterIds(reordered.map((item) => getRowId("footer", item)));
      setManualOrder((prev) => ({ ...prev, footer: true }));
      await persistOrder("footer", reordered, previousItems);
    },
    [footer, getRowId, menu, persistOrder, reorderList, sortedFooter, sortedMenu]
  );

  const handleDragStart = (section: NavSection, item: MenuItem | FooterItem) => (event: DragEvent) => {
    if (isReordering) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a,input,select,textarea")) {
      event.preventDefault();
      return;
    }
    const id = getRowId(section, item);
    setDragState({ section, id });
    setDragOverId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (section: NavSection, item: MenuItem | FooterItem) => (event: DragEvent) => {
    if (!dragState || dragState.section !== section) return;
    event.preventDefault();
    const id = getRowId(section, item);
    setDragOverId(id);
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (section: NavSection, item: MenuItem | FooterItem) => (event: DragEvent) => {
    if (!dragState || dragState.section !== section) return;
    event.preventDefault();
    const id = getRowId(section, item);
    handleReorder(section, dragState.id, id);
    setDragState(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDragOverId(null);
  };

  const createStages = useMemo<CreationStage[]>(() => {
    return [
      {
        id: "type",
        values: [
          {
            id: "type",
            type: "select",
            defaultValue: "",
            validation: { required: true },
            config: {
              label: "Type",
              selectStyle: "enum",
              options: [
                { label: "Internal", value: "internal" },
                { label: "External", value: "external" },
                { label: "Special", value: "special" }
              ]
            }
          }
        ],
        branches: [
          { when: (vals) => vals.type === "internal", next: "internal" },
          { when: (vals) => vals.type === "external", next: "external" },
          { when: (vals) => vals.type === "special", next: "special" }
        ]
      },
      {
        id: "internal",
        values: [
          {
            id: "view",
            type: "select",
            defaultValue: "",
            validation: { required: true },
            config: {
              label: "View",
              selectStyle: "enum",
              options: viewOptions
            }
          }
        ],
        next: null
      },
      {
        id: "external",
        values: [
          {
            id: "label",
            type: "text",
            defaultValue: "",
            validation: { required: true },
            config: { label: "Label", placeholder: "Label" }
          },
          {
            id: "href",
            type: "url",
            defaultValue: "",
            validation: { required: true },
            config: { label: "URL", placeholder: "https://" }
          }
        ],
        next: null
      },
      {
        id: "special",
        values: [
          {
            id: "special",
            type: "select",
            defaultValue: "",
            validation: { required: true },
            config: {
              label: "Special",
              selectStyle: "enum",
              options: specialOptions.map((option) => ({ label: option.label, value: option.value }))
            }
          }
        ],
        next: null
      }
    ];
  }, [viewOptions]);

  const editStages = useMemo<CreationStage[]>(() => {
    return [
      {
        id: "edit",
        values: [
          {
            id: "label",
            type: "text",
            defaultValue: selectedItem?.item.label ?? "",
            validation: { required: true },
            config: { label: "Label", placeholder: "Label" }
          },
          {
            id: "href",
            type: "url",
            defaultValue: selectedItem?.item.href ?? "",
            validation: { required: true },
            config: { label: "URL", placeholder: "/path" }
          }
        ]
      }
    ];
  }, [selectedItem]);

  const renderEditor = (section: NavSection) => {
    const isEditing = editorMode === "edit" && selectedItem?.section === section;
    const selectedKey = selectedItem ? getNavDataId(selectedItem.section, selectedItem.item) : "new";
    const creationKey = `nav-${section}-create-${createVersion}`;
    const editKey = `nav-${section}-edit-${selectedKey}`;
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
          onChange={isEditing ? undefined : setCreateValues}
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
        <h2>Header/Footer</h2>
        <p>Manage navigation buttons in the header and footer.</p>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <Tabs value={activeSection} onValueChange={handleSectionChange} className="nav-subtabs-wrapper">
        <TabsList className="nav-subtabs">
          <TabsTrigger value="header" className="nav-subtab">
            Header
          </TabsTrigger>
          <TabsTrigger value="footer" className="nav-subtab">
            Footer
          </TabsTrigger>
        </TabsList>
        <TabsContent value="header" className="nav-subtab-content">
          <div className="nav-panel-grid">
            <div className="section-card nav-table-card">
              <Table className="nav-table">
                <TableBody>
                  {sortedMenu.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="nav-table-empty">
                        <span className="muted">No header buttons yet.</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedMenu.map((item) => {
                      const isSelected =
                        selectedItem?.section === "header" &&
                        (selectedItem.item as MenuItem).menu_id === item.menu_id;
                      return (
                        <TableRow
                          key={item.menu_id}
                          data-state={isSelected ? "selected" : undefined}
                          className={cn(
                            "nav-table-row",
                            dragState?.id === getRowId("header", item) && "is-dragging",
                            dragOverId === getRowId("header", item) && "is-drop-target"
                          )}
                          draggable={!isReordering}
                          onDragStart={handleDragStart("header", item)}
                          onDragOver={handleDragOver("header", item)}
                          onDrop={handleDrop("header", item)}
                          onDragEnd={handleDragEnd}
                          onMouseEnter={() =>
                            setHoveredItem({ section: "header", id: getNavDataId("header", item) })
                          }
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <TableCell className="nav-table-label">{item.label}</TableCell>
                          <TableCell className="nav-table-href">{item.href}</TableCell>
                          <TableCell className="nav-table-actions">
                            <ObjectActionDropdown
                              onEdit={() => startEdit("header", item)}
                              onDelete={() => setPendingDelete({ section: "header", item })}
                              triggerLabel="Header actions"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {renderEditor("header")}
          </div>
        </TabsContent>

        <TabsContent value="footer" className="nav-subtab-content">
          <div className="nav-panel-grid">
            <div className="section-card nav-table-card">
              <Table className="nav-table">
                <TableBody>
                  {sortedFooter.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="nav-table-empty">
                        <span className="muted">No footer buttons yet.</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedFooter.map((item) => {
                      const isSelected =
                        selectedItem?.section === "footer" &&
                        (selectedItem.item as FooterItem).footer_id === item.footer_id;
                      return (
                        <TableRow
                          key={item.footer_id}
                          data-state={isSelected ? "selected" : undefined}
                          className={cn(
                            "nav-table-row",
                            dragState?.id === getRowId("footer", item) && "is-dragging",
                            dragOverId === getRowId("footer", item) && "is-drop-target"
                          )}
                          draggable={!isReordering}
                          onDragStart={handleDragStart("footer", item)}
                          onDragOver={handleDragOver("footer", item)}
                          onDrop={handleDrop("footer", item)}
                          onDragEnd={handleDragEnd}
                          onMouseEnter={() =>
                            setHoveredItem({ section: "footer", id: getNavDataId("footer", item) })
                          }
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <TableCell className="nav-table-label">{item.label}</TableCell>
                          <TableCell className="nav-table-href">{item.href}</TableCell>
                          <TableCell className="nav-table-actions">
                            <ObjectActionDropdown
                              onEdit={() => startEdit("footer", item)}
                              onDelete={() => setPendingDelete({ section: "footer", item })}
                              triggerLabel="Footer actions"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {renderEditor("footer")}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete navigation item"
        description={pendingDelete ? `Delete ${pendingDelete.item.label}?` : undefined}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
