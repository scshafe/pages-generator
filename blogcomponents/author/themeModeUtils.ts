"use client";

export type ThemeModeSection = "general" | "header" | "footer" | "view" | "groups" | "units";

export type StyleValues = {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
};

export const themeModeSelectors: Record<ThemeModeSection, string[]> = {
  general: ["body"],
  header: [".header"],
  footer: [".footer"],
  view: [".surface.hero", ".surface"],
  groups: [".group-container"],
  units: [".text-unit"]
};

export const fallbackValues: StyleValues = {
  backgroundColor: "#ffffff",
  textColor: "#000000",
  borderColor: "#d7cdbf",
  fontFamily: "",
  fontSize: "16px",
  lineHeight: "1.6"
};

export const resolveTarget = (selectors: string[]) => {
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (element) return element;
  }
  return null;
};

const rgbToHex = (value: string, fallback: string) => {
  if (!value) return fallback;
  if (value.startsWith("#")) return value;
  const match = value.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!match) return fallback;
  const hex = match
    .slice(1, 4)
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
};

export const readComputedValues = (element: HTMLElement): StyleValues => {
  const styles = window.getComputedStyle(element);
  return {
    backgroundColor: rgbToHex(styles.backgroundColor, fallbackValues.backgroundColor),
    textColor: rgbToHex(styles.color, fallbackValues.textColor),
    borderColor: rgbToHex(styles.borderTopColor, fallbackValues.borderColor),
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    lineHeight: styles.lineHeight
  };
};

export const getThemeModeSnapshot = (): Record<ThemeModeSection, StyleValues> => {
  const snapshot = {} as Record<ThemeModeSection, StyleValues>;
  (Object.keys(themeModeSelectors) as ThemeModeSection[]).forEach((section) => {
    const target = resolveTarget(themeModeSelectors[section]);
    snapshot[section] = target ? readComputedValues(target) : fallbackValues;
  });
  return snapshot;
};
