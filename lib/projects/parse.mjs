// Frontmatter parser + validator for projects/*.md files.
// Plain ESM so both the Next.js app (lib/projects.ts) and the standalone
// validator (scripts/validate-projects.mjs) share one implementation.
//
// The supported frontmatter is a deliberate YAML subset — the full schema is
// documented in projects/AGENT_GUIDE.md. Keep guide, parser, and declaration
// file (parse.d.mts) in sync when changing fields.

export const PROJECT_STATUSES = ["active", "exploring", "paused", "completed", "archived"];

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PROJECT_FILE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

const KNOWN_FIELDS = new Set([
  "title",
  "summary",
  "status",
  "tags",
  "repo",
  "demo",
  "started",
  "updated",
  "featured",
  "order"
]);

const URL_RE = /^https:\/\/\S+$/;
const MONTH_OR_DATE_RE = /^\d{4}-\d{2}(?:-\d{2})?$/;
const FULL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseScalar(raw) {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (value !== "" && !Number.isNaN(Number(value)) && /^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

function parseInlineArray(raw) {
  const inner = raw.trim().slice(1, -1).trim();
  if (inner === "") return [];
  return inner.split(",").map((item) => parseScalar(item));
}

/**
 * Parse one project markdown file.
 * Never throws: collects human-readable problems into `errors` and returns
 * `project: null` when any were found.
 */
export function parseProjectFile(fileName, raw) {
  const errors = [];
  const slug = fileName.replace(/\.md$/, "");

  if (!SLUG_RE.test(slug)) {
    errors.push(
      `file name "${fileName}" must be <slug>.md where slug is lowercase kebab-case (a-z, 0-9, hyphens)`
    );
  }

  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { slug, project: null, errors: [...errors, 'file must start with a "---" frontmatter fence on line 1'] };
  }

  let closeIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closeIndex = i;
      break;
    }
  }
  if (closeIndex === -1) {
    return { slug, project: null, errors: [...errors, 'frontmatter is missing its closing "---" fence'] };
  }

  const fields = {};
  let i = 1;
  while (i < closeIndex) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    const keyMatch = /^([A-Za-z_][A-Za-z0-9_]*):(.*)$/.exec(trimmed);
    if (!keyMatch) {
      errors.push(`frontmatter line ${i + 1} is not "key: value": ${JSON.stringify(trimmed)}`);
      i++;
      continue;
    }

    const key = keyMatch[1];
    const rest = keyMatch[2].trim();

    if (!KNOWN_FIELDS.has(key)) {
      errors.push(`unknown frontmatter field "${key}" (allowed: ${[...KNOWN_FIELDS].join(", ")})`);
    }
    if (key in fields) {
      errors.push(`duplicate frontmatter field "${key}"`);
    }

    if (rest === "") {
      // Block array: consecutive "- item" lines.
      const items = [];
      let j = i + 1;
      while (j < closeIndex) {
        const itemMatch = /^\s*-\s+(.*)$/.exec(lines[j]);
        if (!itemMatch) break;
        items.push(parseScalar(itemMatch[1]));
        j++;
      }
      if (items.length === 0) {
        errors.push(`field "${key}" has no value (expected a scalar or "- item" lines below it)`);
      }
      fields[key] = items;
      i = j;
      continue;
    }

    fields[key] = rest.startsWith("[") && rest.endsWith("]") ? parseInlineArray(rest) : parseScalar(rest);
    i++;
  }

  const body = lines
    .slice(closeIndex + 1)
    .join("\n")
    .trim();

  // --- field validation ---

  const requireString = (key, maxLen) => {
    const value = fields[key];
    if (value === undefined) {
      errors.push(`missing required field "${key}"`);
      return undefined;
    }
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`field "${key}" must be a non-empty string`);
      return undefined;
    }
    if (value.length > maxLen) {
      errors.push(`field "${key}" is too long (${value.length} chars, max ${maxLen})`);
    }
    return value.trim();
  };

  const optionalString = (key, validate, hint) => {
    const value = fields[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string" || !validate(value)) {
      errors.push(`field "${key}" must be ${hint} (got ${JSON.stringify(value)})`);
      return undefined;
    }
    return value;
  };

  const title = requireString("title", 120);
  const summary = requireString("summary", 300);

  let status = "active";
  if (fields.status !== undefined) {
    if (typeof fields.status === "string" && PROJECT_STATUSES.includes(fields.status)) {
      status = fields.status;
    } else {
      errors.push(`field "status" must be one of: ${PROJECT_STATUSES.join(", ")}`);
    }
  }

  let tags = [];
  if (fields.tags !== undefined) {
    if (
      Array.isArray(fields.tags) &&
      fields.tags.every((tag) => typeof tag === "string" && tag.trim() !== "")
    ) {
      tags = fields.tags.map((tag) => tag.trim());
      if (tags.length > 8) errors.push(`field "tags" allows at most 8 tags (got ${tags.length})`);
      for (const tag of tags) {
        if (tag.length > 24) errors.push(`tag "${tag}" is too long (max 24 chars)`);
      }
    } else {
      errors.push(`field "tags" must be an array of strings, e.g. [rust, cli] or "- rust" lines`);
    }
  }

  const repo = optionalString("repo", (value) => URL_RE.test(value), "an https:// URL");
  const demo = optionalString("demo", (value) => URL_RE.test(value), "an https:// URL");
  const started = optionalString(
    "started",
    (value) => MONTH_OR_DATE_RE.test(value),
    'a date like "2026-01" or "2026-01-15" (quote it or not, both work)'
  );
  const updated = optionalString(
    "updated",
    (value) => FULL_DATE_RE.test(value),
    'a full date like "2026-07-28"'
  );

  let featured = false;
  if (fields.featured !== undefined) {
    if (typeof fields.featured === "boolean") {
      featured = fields.featured;
    } else {
      errors.push(`field "featured" must be true or false`);
    }
  }

  let order = 100;
  if (fields.order !== undefined) {
    if (typeof fields.order === "number" && Number.isFinite(fields.order)) {
      order = fields.order;
    } else {
      errors.push(`field "order" must be a number (lower sorts earlier)`);
    }
  }

  if (body === "") {
    errors.push("body is empty — add at least a short description below the frontmatter");
  }

  if (errors.length > 0 || title === undefined || summary === undefined) {
    return { slug, project: null, errors };
  }

  return {
    slug,
    project: { slug, title, summary, status, tags, repo, demo, started, updated, featured, order, body },
    errors: []
  };
}
