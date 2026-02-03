import { promises as fs } from "node:fs";
import path from "node:path";

export interface MetadataSnapshot {
  nodes: unknown[];
  references: unknown[];
  components: Record<string, unknown[]>;
  settings: {
    home: unknown;
    site?: unknown;
    menu: unknown[];
    footer: unknown[];
    purposes?: unknown[];
    customComponents?: unknown[];
    themes: unknown[];
    themeConfig: unknown;
  };
  assets?: unknown[];
}

export async function loadMetadataSnapshot(): Promise<MetadataSnapshot | null> {
  try {
    const filePath = path.join(process.cwd(), "content", "metadata.json");
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as MetadataSnapshot;
  } catch {
    return null;
  }
}
