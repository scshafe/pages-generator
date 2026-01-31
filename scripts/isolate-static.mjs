import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, "build-output.config.json");
const outDir = path.join(repoRoot, "out");

function isSubpath(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

async function readConfig() {
  const raw = await fs.readFile(configPath, "utf-8");
  return JSON.parse(raw);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyDir(src, dest) {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function clearDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const target = path.join(dir, entry.name);
        await fs.rm(target, { recursive: true, force: true });
      })
    );
  } catch {
    // directory doesn't exist
  }
}

async function ensureNoJekyll(targetDir) {
  const filePath = path.join(targetDir, ".nojekyll");
  try {
    await fs.writeFile(filePath, "");
  } catch {
    // Ignore
  }
}

async function main() {
  const config = await readConfig();
  const staticDirRaw = config.staticDir ?? ".static-out";
  const staticDir = path.resolve(repoRoot, staticDirRaw);

  if (!isSubpath(repoRoot, staticDir)) {
    throw new Error("staticDir must be inside this repo");
  }

  if (staticDir === outDir) {
    await ensureNoJekyll(outDir);
    return;
  }

  try {
    await fs.access(outDir);
  } catch {
    throw new Error("Missing build output in /out. Run `npm run build` first.");
  }

  await clearDir(staticDir);
  await copyDir(outDir, staticDir);
  await ensureNoJekyll(staticDir);
  console.info(`Static output copied to ${staticDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
