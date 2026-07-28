export const settingsTabs = [
  { id: "site", label: "Site" },
  { id: "styles", label: "Voices" },
  { id: "navigation", label: "Header/Footer" },
  { id: "purposes", label: "Purposes" },
  { id: "custom-components", label: "CustomComponents" },
  { id: "media", label: "Media" },
  { id: "ai", label: "AI" },
  { id: "theme", label: "Theme" },
  { id: "cursor", label: "Cursor" },
  { id: "shortcuts", label: "Shortcuts" }
] as const;

export type SettingsTabId = (typeof settingsTabs)[number]["id"];
