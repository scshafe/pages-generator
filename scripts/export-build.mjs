import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, "build-output.config.json");
const outDir = path.join(repoRoot, "out");

async function loadConfig() {
  const raw = await fs.readFile(configPath, "utf-8");
  return JSON.parse(raw);
}

function isSubpath(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function cleanDir(targetDir, preserve) {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      if (preserve.has(entry.name)) return;
      const target = path.join(targetDir, entry.name);
      await fs.rm(target, { recursive: true, force: true });
    })
  );
}

async function copyDir(src, dest, exclude) {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, exclude);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function ensureNoJekyll(targetDir) {
  const filePath = path.join(targetDir, ".nojekyll");
  try {
    await fs.writeFile(filePath, "");
  } catch {
    // Ignore write failures; export still succeeds.
  }
}

async function main() {
  const config = await loadConfig();
  const outputDirRaw = config.outputDir;
  const staticDirRaw = config.staticDir;
  if (!outputDirRaw || typeof outputDirRaw !== "string") {
    throw new Error("build-output.config.json must include an outputDir string");
  }

  const outputDir = path.resolve(repoRoot, outputDirRaw);
  const staticDir = staticDirRaw ? path.resolve(repoRoot, staticDirRaw) : null;
  if (isSubpath(repoRoot, outputDir)) {
    throw new Error("outputDir must be outside the repo to avoid destructive deletes");
  }

  const preserve = new Set([".git", ...(Array.isArray(config.preserve) ? config.preserve : [])]);
  const clean = config.clean !== false;

  await ensureDir(outputDir);
  let sourceDir = outDir;
  if (staticDir) {
    try {
      await fs.access(staticDir);
      sourceDir = staticDir;
    } catch {
      sourceDir = outDir;
    }
  }

  try {
    await fs.access(sourceDir);
  } catch {
    throw new Error("Missing build output. Run `npm run build` first.");
  }

  await ensureNoJekyll(sourceDir);

  if (clean) {
    await cleanDir(outputDir, preserve);
  }

  await copyDir(sourceDir, outputDir, preserve);
  await ensureNoJekyll(outputDir);
  console.info(`Exported static build to ${outputDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
