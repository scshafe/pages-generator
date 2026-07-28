import fs from "node:fs/promises";
import path from "node:path";
import { apiFetch } from "@/lib/api/client";
import type { ResolvedNode } from "@/lib/content/types";
import type { TerminologyMap, VocabSegment } from "@/lib/content/terminology.types";

const buildMode = process.env.NEXT_PUBLIC_BUILD_MODE;

export async function loadTerminology(): Promise<TerminologyMap> {
  if (buildMode === "publish") {
    try {
      const filePath = path.join(process.cwd(), "content", "settings", "terminology.json");
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as TerminologyMap;
      return parsed ?? {};
    } catch {
      return {};
    }
  }
  try {
    const response = await apiFetch<TerminologyMap>("/terminology");
    return response ?? {};
  } catch {
    return {};
  }
}

export function buildVocabSegments(
  view: ResolvedNode,
  terminology: TerminologyMap,
  activeTermsInput: unknown
): Record<number, VocabSegment[]> {
  const activeTerms = normalizeActiveTerms(activeTermsInput).filter((term) => terminology[term]);
  if (activeTerms.length === 0) return {};

  const termLookup = new Map<string, string>();
  for (const term of activeTerms) {
    const key = term.toLowerCase();
    if (!termLookup.has(key)) {
      termLookup.set(key, term);
    }
  }

  const pattern = buildTermRegex(activeTerms);
  if (!pattern) return {};

  const termCounts = new Map<string, number>();
  const segmentsByNodeId: Record<number, VocabSegment[]> = {};
  const textUnits = collectTextUnits(view);

  for (const item of textUnits) {
    const segments = splitTextSegments(
      item.text,
      pattern,
      termLookup,
      terminology,
      termCounts
    );
    if (segments.length) {
      segmentsByNodeId[item.nodeId] = segments;
    }
  }

  return segmentsByNodeId;
}

function normalizeActiveTerms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
    .filter((item) => item.length > 0);
}

function collectTextUnits(view: ResolvedNode) {
  const items: Array<{ nodeId: number; text: string }> = [];
  const walk = (node: ResolvedNode) => {
    if (node.component?.type === "PlainTextUnit") {
      const text = String((node.config as { text?: string }).text ?? "");
      items.push({ nodeId: node.node.node_id, text });
    }
    if (node.children?.length) {
      node.children.forEach((child) => walk(child));
    }
  };
  walk(view);
  return items;
}

function buildTermRegex(terms: string[]) {
  const escaped = terms
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .sort((a, b) => b.length - a.length)
    .map((term) => escapeRegex(term));
  if (!escaped.length) return null;
  return new RegExp(`(${escaped.join("|")})`, "gi");
}

function splitTextSegments(
  text: string,
  pattern: RegExp,
  termLookup: Map<string, string>,
  terminology: TerminologyMap,
  termCounts: Map<string, number>
): VocabSegment[] {
  if (!text) return [{ type: "text", value: "" }];

  const segments: VocabSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  pattern.lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    const matchText = match[0] ?? "";
    if (!matchText) continue;
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    const termKey = termLookup.get(matchText.toLowerCase()) ?? matchText;
    const entry = terminology[termKey] ?? { Definitions: [], Examples: [] };
    const count = termCounts.get(termKey) ?? 0;
    termCounts.set(termKey, count + 1);
    segments.push({
      type: "term",
      value: matchText,
      term: termKey,
      isFirst: count === 0,
      definitions: Array.isArray(entry.Definitions) ? entry.Definitions : [],
      examples: Array.isArray(entry.Examples) ? entry.Examples : []
    });
    lastIndex = index + matchText.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value: text }];
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
