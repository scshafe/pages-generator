import fs from "node:fs";
import path from "node:path";
import { parseProjectFile, PROJECT_FILE_RE } from "@/lib/projects/parse.mjs";
import type { ParsedProject } from "@/lib/projects/parse.mjs";

export type Project = ParsedProject;

const PROJECTS_DIR = path.join(process.cwd(), "projects");

// Fail the build loudly on an invalid file rather than silently dropping the
// project from the published site. A broken file can never affect how the
// other files render — each is parsed independently.
export function listProjects(): Project[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  const files = fs
    .readdirSync(PROJECTS_DIR)
    .filter((file) => PROJECT_FILE_RE.test(file))
    .sort();

  const projects: Project[] = [];
  const problems: string[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(PROJECTS_DIR, file), "utf8");
    const { project, errors } = parseProjectFile(file, raw);
    if (!project) {
      problems.push(`${file}: ${errors.join("; ")}`);
      continue;
    }
    projects.push(project);
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid project file(s) in projects/:\n${problems.map((p) => `  - ${p}`).join("\n")}\n` +
        "Run `npm run projects:validate` for a full report."
    );
  }

  projects.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });

  return projects;
}

export function getProject(slug: string): Project | null {
  return listProjects().find((project) => project.slug === slug) ?? null;
}
