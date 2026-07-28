import type { CustomColorObject } from "@/lib/content/types";

export type CustomColorType = "general" | "header" | "footer" | "view" | "groups" | "units";

export const customColorTypes = [
  { value: "general", label: "General" },
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "view", label: "View" },
  { value: "groups", label: "Groups" },
  { value: "units", label: "Units" }
] as const;

export const defaultCustomColor: CustomColorObject = {
  backgroundColor: "#ffffff",
  textColor: "#000000",
  borderColor: "#d7cdbf",
  fontFamily: "",
  fontSize: "16px",
  lineHeight: "1.6"
};
