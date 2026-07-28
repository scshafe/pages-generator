#!/usr/bin/env node
// Ingests the JobTrack public-profile export (contract v2) into projects/*.md.
//
// JobTrack is the system of record; this script is the only sanctioned
// crossing point on the site side. It reads the allowlisted artifact produced
// by `jobtrack export public-profile` (contract:
// contracts/export/public-profile.v2.schema.json in the jobtrack repo),
// regenerates one markdown file per exported project, deletes previously
// generated pages whose project left the artifact (hidden or removed), and
// never touches hand-authored entries. Re-runs are idempotent.
//
// v2 curation mapping: pinned -> featured, export array order -> frontmatter
// order, kind -> leading tag, public repos -> repo frontmatter + Repositories
// section, uses -> Built with cross-links. Private repos never reach the
// artifact at all.
//
// Usage: node scripts/ingest-jobtrack.mjs [--in ~/.jobtrack/public-profile.json] [--dry-run]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectsDir = path.join(root, "projects");
const GENERATED_MARKER = "Generated from the JobTrack public-profile export";

// Entries whose slug already has a hand-authored owner on the site.
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
if (artifact.contract !== "public-profile" || artifact.contractVersion !== 2) {
  console.error(`ERROR: ${artifactPath} is not a public-profile v2 artifact (found version ${artifact.contractVersion}). Re-export with an up-to-date jobtrack.`);
  process.exit(1);
}

const skillsByUuid = new Map(artifact.skills.map((skill) => [skill.uuid, skill]));
const projectByUuid = new Map(artifact.projects.map((project) => [project.uuid, project]));
const updated = String(artifact.generatedAt).slice(0, 10);
const written = [];
const skipped = [];
const removed = [];

const writtenSlugs = new Set();
artifact.projects.forEach((project, index) => {
  const slug = slugify(project.name);
  if (SKIP_SLUGS.has(slug)) {
    skipped.push({ slug, reason: SKIP_SLUGS.get(slug) });
    return;
  }
  const file = path.join(projectsDir, `${slug}.md`);
  if (!dryRun) fs.writeFileSync(file, renderProject(project, index));
  written.push(`${slug}.md`);
  writtenSlugs.add(slug);
});

// Stale cleanup: generated pages whose project left the artifact (hidden or
// deleted upstream). Hand-authored files never carry the marker.
for (const file of fs.readdirSync(projectsDir).filter((name) => name.endsWith(".md"))) {
  if (file === "AGENT_GUIDE.md" || file.startsWith("_")) continue;
  const slug = file.replace(/\.md$/, "");
  if (writtenSlugs.has(slug) || SKIP_SLUGS.has(slug)) continue;
  const content = fs.readFileSync(path.join(projectsDir, file), "utf8");
  if (!content.includes(GENERATED_MARKER)) continue;
  if (!dryRun) fs.unlinkSync(path.join(projectsDir, file));
  removed.push(file);
}

console.log(JSON.stringify({
  artifact: artifactPath,
  contractVersion: artifact.contractVersion,
  generatedAt: artifact.generatedAt,
  written,
  removed,
  skipped,
  dryRun
}, null, 2));

function renderProject(project, index) {
  const kindTag = slugify(project.kind || "application");
  const tags = [kindTag, ...(project.stack || []).map((item) => slugify(item))]
    .filter((tag, position, all) => tag.length > 0 && tag.length <= 24 && all.indexOf(tag) === position)
    .slice(0, 8);
  const primaryRepo = (project.repos || []).find((repo) => repo.role === "primary") || null;
  const demo = project.url && !(project.repos || []).some((repo) => repo.url === project.url)
    ? project.url
    : null;
  const status = project.endDate ? "completed" : "active";
  const skillNames = (project.skills || [])
    .map((uuid) => skillsByUuid.get(uuid)?.name)
    .filter(Boolean);
  const highlightLines = splitLines(project.highlights).map((line) => `- ${line}`);
  const usedProjects = (project.uses || [])
    .map((uuid) => projectByUuid.get(uuid))
    .filter(Boolean);

  const frontmatter = [
    "---",
    `title: ${project.name}`,
    `summary: ${truncate(singleLine(project.description) || `${project.name} project.`, 300)}`,
    `status: ${status}`,
    tags.length ? `tags: [${tags.join(", ")}]` : null,
    primaryRepo ? `repo: ${primaryRepo.url}` : null,
    demo ? `demo: ${demo}` : null,
    project.startDate ? `started: ${project.startDate}` : null,
    `updated: ${updated}`,
    project.pinned ? "featured: true" : null,
    `order: ${index + 1}`,
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
  if (usedProjects.length) {
    sections.push(
      "## Built with",
      "",
      ...usedProjects.map((used) => `- [${used.name}](/projects/${slugify(used.name)}/)`),
      ""
    );
  }
  if ((project.repos || []).length > 1) {
    sections.push(
      "## Repositories",
      "",
      ...project.repos.map((repo) => `- [${repo.name}](${repo.url}) (${repo.role})`),
      ""
    );
  }
  if (skillNames.length) {
    sections.push("## Skills", "", skillNames.join(", "), "");
  }
  sections.push(
    `> ${GENERATED_MARKER} (${updated}). ` +
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
