import { useEffect, useMemo, useRef, useState } from "react";

type MenuOption = {
  id: string;
  label: string;
};

type MenuType = "container" | "unit" | "style" | null;

export function useInlineMenuState({
  menuType,
  menuOptions,
  onSelect
}: {
  menuType: MenuType;
  menuOptions: MenuOption[];
  onSelect: (option: MenuOption) => void;
}) {
  const [menuQuery, setMenuQuery] = useState("");
  const [menuIndex, setMenuIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filteredMenuOptions = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    if (!query) return menuOptions;
    return menuOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [menuOptions, menuQuery]);

  const menuHint = menuType === "style"
    ? "Style menu (coming soon)"
    : menuQuery
      ? `Filter: ${menuQuery}`
      : "Type to filter";
  const emptyLabel = menuType === "style" ? "Style menu coming soon" : "No matches";

  useEffect(() => {
    if (!menuType) return;
    setMenuQuery("");
    setMenuIndex(0);
  }, [menuType]);

  useEffect(() => {
    if (filteredMenuOptions.length === 0) {
      if (menuIndex !== -1) {
        setMenuIndex(-1);
      }
      return;
    }
    if (menuIndex < 0 || menuIndex >= filteredMenuOptions.length) {
      setMenuIndex(0);
    }
  }, [filteredMenuOptions.length, menuIndex]);

  useEffect(() => {
    if (!menuType) return;
    requestAnimationFrame(() => {
      if (!filteredMenuOptions.length) {
        menuRef.current?.focus();
        return;
      }
      const target = menuItemRefs.current[menuIndex] ?? menuItemRefs.current[0];
      target?.focus();
    });
  }, [filteredMenuOptions.length, menuIndex, menuType]);

  const updateMenuQuery = (nextQuery: string) => {
    setMenuQuery(nextQuery);
    setMenuIndex(0);
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!filteredMenuOptions.length) return;
      setMenuIndex((prev) => {
        const next = prev + 1;
        return next >= filteredMenuOptions.length ? 0 : next;
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!filteredMenuOptions.length) return;
      setMenuIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? filteredMenuOptions.length - 1 : next;
      });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = filteredMenuOptions[menuIndex];
      if (selected) {
        onSelect(selected);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      return;
    }
    if (event.key === "Backspace") {
      if (!menuQuery) return;
      event.preventDefault();
      updateMenuQuery(menuQuery.slice(0, -1));
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      updateMenuQuery(`${menuQuery}${event.key}`);
    }
  };

  return {
    menuQuery,
    menuIndex,
    filteredMenuOptions,
    menuHint,
    emptyLabel,
    menuRef,
    menuItemRefs,
    handleMenuKeyDown
  };
}
