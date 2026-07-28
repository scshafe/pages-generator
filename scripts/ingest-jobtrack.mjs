#!/usr/bin/env node
// Ingests the JobTrack public-profile export into projects/*.md entries.
//
// JobTrack is the system of record for project/profile data; this script is
// the only sanctioned crossing point on the site side. It reads the
// allowlisted artifact produced by `jobtrack export public-profile`
// (contract: contracts/export/public-profile.v1.schema.json in the jobtrack
// repo), regenerates one markdown file per project in projects/, and never
// touches entries it does not own. Re-runs are idempotent: each generated
// file is wholly owned by its artifact project and rewritten in place.
//
// Usage: node scripts/ingest-jobtrack.mjs [--in ~/.jobtrack/public-profile.json] [--dry-run]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectsDir = path.join(root, "projects");

// Entries whose slug already has a hand-authored owner on the site. The
// generator's own entry predates ingestion and self-describes; the artifact's
// "pages-generator + scshafe.github.io" project is the same work.
const SKIP_SLUGS = new Map([
  ["pages-generator-scshafe-github-io", "site already self-describes in the hand-authored pages-generator.md"]
]);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const inFlagIndex = args.indexOf("--in");
const artifactPath = inFlagIndex !== -1
  ? path.resolve(args[inFlagIndex + 1])
  : path.join(os.homedir(), ".jobtrack", "public-profile.json");

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
if (artifact.contract !== "public-profile" || artifact.contractVersion !== 1) {
  console.error(`ERROR: ${artifactPath} is not a public-profile v1 artifact`);
  process.exit(1);
}

const skillsByUuid = new Map(artifact.skills.map((skill) => [skill.uuid, skill]));
const updated = String(artifact.generatedAt).slice(0, 10);
const written = [];
const skipped = [];

for (const project of artifact.projects) {
  const slug = slugify(project.name);
  if (SKIP_SLUGS.has(slug)) {
    skipped.push({ slug, reason: SKIP_SLUGS.get(slug) });
    continue;
  }
  const file = path.join(projectsDir, `${slug}.md`);
  const body = renderProject(project, slug);
  if (!dryRun) fs.writeFileSync(file, body);
  written.push(`${slug}.md`);
}

console.log(JSON.stringify({
  artifact: artifactPath,
  generatedAt: artifact.generatedAt,
  written,
  skipped,
  dryRun
}, null, 2));

function renderProject(project, slug) {
  const tags = (project.stack || [])
    .map((item) => slugify(item))
    .filter((tag) => tag.length > 0 && tag.length <= 24)
    .slice(0, 8);
  const repo = firstHttpsGithubLink(project);
  const status = project.endDate ? "completed" : "active";
  const skillNames = (project.skills || [])
    .map((uuid) => skillsByUuid.get(uuid)?.name)
    .filter(Boolean);
  const highlightLines = splitLines(project.highlights).map((line) => `- ${line}`);

  const frontmatter = [
    "---",
    `title: ${project.name}`,
    `summary: ${truncate(singleLine(project.description) || `${project.name} project.`, 300)}`,
    `status: ${status}`,
    tags.length ? `tags: [${tags.join(", ")}]` : null,
    repo ? `repo: ${repo}` : null,
    project.startDate ? `started: ${project.startDate}` : null,
    `updated: ${updated}`,
    "---"
  ].filter(Boolean);

  const sections = [
    "## What it is",
    "",
    [project.description, project.role ? `Role: ${project.role}.` : null].filter(Boolean).join(" "),
    ""
  ];
  if (highlightLines.length) {
    sections.push("## Highlights", "", ...highlightLines, "");
  }
  if (skillNames.length) {
    sections.push("## Skills", "", skillNames.join(", "), "");
  }
  sections.push(
    `> Generated from the JobTrack public-profile export (${updated}). ` +
    "Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten."
  );

  return `${frontmatter.join("\n")}\n\n${sections.join("\n")}\n`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function firstHttpsGithubLink(project) {
  const candidates = [project.url, ...(project.links || [])].filter(Boolean);
  return candidates.find((link) => /^https:\/\/github\.com\//.test(link))
    || candidates.find((link) => /^https:\/\//.test(link))
    || null;
}

function singleLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncate(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
