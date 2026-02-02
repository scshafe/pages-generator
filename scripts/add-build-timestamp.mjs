import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const contentDir = path.join(repoRoot, "content");
const nodesDir = path.join(contentDir, "nodes");
const referencesDir = path.join(contentDir, "references");
const componentsDir = path.join(contentDir, "components");
const plainTextDir = path.join(componentsDir, "PlainTextUnit");
const homeFile = path.join(contentDir, "settings", "home.json");

const containerTypes = new Set(["Container", "Group"]);

function nowIso() {
  return new Date().toISOString();
}

function formatTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys(value[key]);
    }
    return sorted;
  }
  return value;
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const sorted = sortKeys(data);
  await fs.writeFile(filePath, JSON.stringify(sorted, null, 2));
}

async function generateId(dirPath) {
  while (true) {
    const id = Math.floor(Math.random() * 0xffffffff);
    const candidate = path.join(dirPath, `${id}.json`);
    try {
      await fs.access(candidate);
    } catch {
      return id;
    }
  }
}

async function buildComponentIndex() {
  const map = new Map();
  const entries = await fs.readdir(componentsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const typeDir = path.join(componentsDir, entry.name);
    const files = await fs.readdir(typeDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const compId = Number(file.replace(".json", ""));
      if (!Number.isFinite(compId)) continue;
      map.set(compId, { type: entry.name, path: path.join(typeDir, file) });
    }
  }
  return map;
}

async function readAllReferences() {
  const refs = new Map();
  const counts = new Map();
  const files = await fs.readdir(referencesDir);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const ref = await readJson(path.join(referencesDir, file));
    refs.set(ref.ref_id, ref);
    const count = counts.get(ref.comp_id) ?? 0;
    counts.set(ref.comp_id, count + 1);
  }
  return { refs, counts };
}

async function collectNodeList(startId, state) {
  let cursor = startId;
  while (cursor) {
    await collectNodeTree(cursor, state);
    const node = state.nodes.get(cursor);
    cursor = node?.next_node_id ?? null;
  }
}

async function collectNodeTree(nodeId, state) {
  if (state.nodes.has(nodeId)) return;
  const nodePath = path.join(nodesDir, `${nodeId}.json`);
  let node;
  try {
    node = await readJson(nodePath);
  } catch {
    return;
  }
  state.nodes.set(nodeId, node);

  const reference = state.refs.get(node.ref_id);
  if (reference) {
    state.references.set(node.ref_id, reference);
    state.deletedCompIds.add(reference.comp_id);

    const compInfo = state.componentIndex.get(reference.comp_id);
    if (compInfo && containerTypes.has(compInfo.type)) {
      const component = await readJson(compInfo.path);
      const config = { ...component.config, ...(reference.overrides ?? {}) };
      const childNodeId = config.child_node_id ?? null;
      if (childNodeId) {
        await collectNodeList(childNodeId, state);
      }
    }
  }
}

async function removeExistingChildren(rootComponent, state) {
  const childNodeId = rootComponent.config?.child_node_id ?? null;
  if (!childNodeId) {
    return;
  }
  await collectNodeList(childNodeId, state);

  for (const node of state.nodes.values()) {
    await fs.rm(path.join(nodesDir, `${node.node_id}.json`), { force: true });
  }

  for (const ref of state.references.values()) {
    await fs.rm(path.join(referencesDir, `${ref.ref_id}.json`), { force: true });
    const remaining = (state.compCounts.get(ref.comp_id) ?? 0) - 1;
    state.compCounts.set(ref.comp_id, remaining);
  }

  for (const compId of state.deletedCompIds) {
    const remaining = state.compCounts.get(compId) ?? 0;
    const compInfo = state.componentIndex.get(compId);
    if (!compInfo) continue;
    if (remaining <= 0) {
      await fs.rm(compInfo.path, { force: true });
    } else {
      const component = await readJson(compInfo.path);
      component.reference_count = remaining;
      component.updated_at = nowIso();
      await writeJson(compInfo.path, component);
    }
  }
}

async function main() {
  const home = await readJson(homeFile);
  const rootNodeId = home.root_view_node_id;
  if (!rootNodeId) {
    throw new Error("home.root_view_node_id is not set");
  }

  const rootNode = await readJson(path.join(nodesDir, `${rootNodeId}.json`));
  const rootRef = await readJson(path.join(referencesDir, `${rootNode.ref_id}.json`));
  const componentIndex = await buildComponentIndex();
  const rootComponentInfo = componentIndex.get(rootRef.comp_id);
  if (!rootComponentInfo) {
    throw new Error("Root component not found");
  }
  const rootComponent = await readJson(rootComponentInfo.path);
  const { refs, counts } = await readAllReferences();

  const state = {
    nodes: new Map(),
    references: new Map(),
    refs,
    compCounts: counts,
    componentIndex,
    deletedCompIds: new Set()
  };

  await removeExistingChildren(rootComponent, state);

  const createdAt = nowIso();
  const compId = await generateId(plainTextDir);
  const refId = await generateId(referencesDir);
  const nodeId = await generateId(nodesDir);

  const component = {
    comp_id: compId,
    type: "PlainTextUnit",
    config: { text: `Updated at ${formatTime()}` },
    reference_count: 1,
    created_at: createdAt,
    updated_at: createdAt
  };

  const reference = {
    ref_id: refId,
    node_id: nodeId,
    comp_id: compId,
    overrides: null,
    created_at: createdAt,
    updated_at: createdAt
  };

  const node = {
    node_id: nodeId,
    ref_id: refId,
    parent_node_id: rootNodeId,
    previous_node_id: null,
    next_node_id: null,
    created_at: createdAt,
    updated_at: createdAt
  };

  await writeJson(path.join(plainTextDir, `${compId}.json`), component);
  await writeJson(path.join(referencesDir, `${refId}.json`), reference);
  await writeJson(path.join(nodesDir, `${nodeId}.json`), node);

  rootComponent.config = { ...rootComponent.config, child_node_id: nodeId };
  rootComponent.updated_at = nowIso();
  await writeJson(rootComponentInfo.path, rootComponent);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
