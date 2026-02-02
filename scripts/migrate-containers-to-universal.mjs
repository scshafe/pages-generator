#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.join(ROOT_DIR, "content", "components");
const CONTAINER_DIR = path.join(COMPONENTS_DIR, "Container");
const GROUP_DIR = path.join(COMPONENTS_DIR, "Group");

const LEGACY_TYPES = [
  { folder: "ViewContainer", type: "Container", groupKind: null },
  { folder: "ListContainer", type: "Group", groupKind: "list" },
  { folder: "InlineContainer", type: "Group", groupKind: "inline" },
  { folder: "StyleContainer", type: "Group", groupKind: "style" }
];

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function migrate() {
  const hasComponentsDir = await fileExists(COMPONENTS_DIR);
  if (!hasComponentsDir) {
    console.log("No content/components directory found. Nothing to migrate.");
    return;
  }

  await fs.mkdir(CONTAINER_DIR, { recursive: true });
  await fs.mkdir(GROUP_DIR, { recursive: true });

  for (const entry of LEGACY_TYPES) {
    const legacyDir = path.join(COMPONENTS_DIR, entry.folder);
    const exists = await fileExists(legacyDir);
    if (!exists) continue;

    const files = await fs.readdir(legacyDir);
    for (const fileName of files) {
      if (!fileName.endsWith(".json")) continue;
      const filePath = path.join(legacyDir, fileName);
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const compId = parsed.comp_id ?? Number(fileName.replace(".json", ""));

      const nextConfig = {
        ...(parsed.config ?? {})
      };
      if (entry.groupKind) {
        nextConfig.group_kind = entry.groupKind;
      }

      const next = {
        ...parsed,
        comp_id: compId,
        type: entry.type,
        config: nextConfig
      };

      const targetDir = entry.type === "Group" ? GROUP_DIR : CONTAINER_DIR;
      const targetPath = path.join(targetDir, `${compId}.json`);
      await fs.writeFile(targetPath, JSON.stringify(next, null, 2));
      await fs.unlink(filePath);
      console.log(`Migrated ${entry.folder}/${fileName} -> ${entry.type}/${compId}.json`);
    }
  }

  console.log("Container migration complete.");
}

migrate().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
