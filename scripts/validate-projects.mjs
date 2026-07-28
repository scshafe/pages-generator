#!/usr/bin/env node
// Validates every project file in projects/ against the schema in
// projects/AGENT_GUIDE.md. Exit code 0 = all valid. Designed to be run by
// agents after writing their file:  npm run projects:validate
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseProjectFile, PROJECT_FILE_RE } from "../lib/projects/parse.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectsDir = path.join(root, "projects");

if (!fs.existsSync(projectsDir)) {
  console.error(`projects/ directory not found at ${projectsDir}`);
  process.exit(1);
}

const entries = fs.readdirSync(projectsDir).filter((file) => file.endsWith(".md"));

let errorCount = 0;
let validCount = 0;
const titles = new Map();

for (const file of entries.sort()) {
  if (file === "AGENT_GUIDE.md" || file.startsWith("_")) {
    console.log(`SKIP  ${file} (not a project entry)`);
    continue;
  }

  if (!PROJECT_FILE_RE.test(file)) {
    console.log(`ERROR ${file}: file name must be <slug>.md with a lowercase kebab-case slug`);
    errorCount++;
    continue;
  }

  const raw = fs.readFileSync(path.join(projectsDir, file), "utf8");
  const { project, errors } = parseProjectFile(file, raw);

  if (!project) {
    console.log(`ERROR ${file}:`);
    for (const error of errors) {
      console.log(`      - ${error}`);
    }
    errorCount += errors.length;
    continue;
  }

  const existing = titles.get(project.title.toLowerCase());
  if (existing) {
    console.log(`ERROR ${file}: title ${JSON.stringify(project.title)} duplicates ${existing}`);
    errorCount++;
    continue;
  }
  titles.set(project.title.toLowerCase(), file);

  validCount++;
  console.log(`OK    ${file} — "${project.title}" [${project.status}]`);
}

console.log(`\n${validCount} valid project file(s), ${errorCount} error(s).`);
process.exit(errorCount > 0 ? 1 : 0);
