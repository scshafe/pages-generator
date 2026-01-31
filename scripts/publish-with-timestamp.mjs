import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const configPath = path.join(repoRoot, "build-output.config.json");

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
      }
    });
  });
}

function runCapture(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
      }
    });
  });
}

async function loadConfig() {
  const raw = await fs.readFile(configPath, "utf-8");
  return JSON.parse(raw);
}

async function main() {
  const config = await loadConfig();
  const outputDirRaw = config.outputDir;
  if (!outputDirRaw || typeof outputDirRaw !== "string") {
    throw new Error("build-output.config.json must include an outputDir string");
  }

  const outputDir = path.resolve(repoRoot, outputDirRaw);

  await run("node", ["scripts/add-build-timestamp.mjs"], { cwd: repoRoot });
  await run(getNpmCommand(), ["run", "build:export"], { cwd: repoRoot });

  await run("git", ["rev-parse", "--is-inside-work-tree"], { cwd: outputDir });
  const status = await runCapture("git", ["status", "--porcelain"], { cwd: outputDir });
  if (!status.trim()) {
    console.info("No changes to commit in export directory.");
    return;
  }

  await run("git", ["add", "-A"], { cwd: outputDir });
  const message = `Update static export ${new Date().toISOString()}`;
  await run("git", ["commit", "-m", message], { cwd: outputDir });
  await run("git", ["push"], { cwd: outputDir });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
