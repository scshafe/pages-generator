import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { stdin as input, stdout as output } from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");

const rl = readline.createInterface({ input, output });

function formatValue(value) {
  if (value === "") return "";
  const needsQuotes = /\s|#/.test(value);
  if (!needsQuotes) return value;
  return `"${value.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"")}"`;
}

async function ask(prompt, defaultValue = "") {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await rl.question(`${prompt}${suffix}: `);
  const trimmed = answer.trim();
  if (!trimmed && defaultValue !== undefined) return defaultValue;
  return trimmed;
}

async function askChoice(prompt, choices, defaultValue) {
  const normalized = choices.map((choice) => choice.toLowerCase());
  while (true) {
    const answer = (await ask(prompt, defaultValue)).toLowerCase();
    if (normalized.includes(answer)) return answer;
    console.log(`Please enter one of: ${choices.join(", ")}`);
  }
}

async function askPort(prompt, defaultValue) {
  while (true) {
    const answer = await ask(prompt, defaultValue);
    if (/^\d+$/.test(answer)) return answer;
    console.log("Please enter a valid numeric port.");
  }
}

async function main() {
  const buildMode = await askChoice("Build mode (author/publish)", ["author", "publish"], "author");
  const frontendPort = await askPort("Frontend port", "4000");
  const backendPort = await askPort("Backend port", "4001");
  const adapter = await askChoice("Storage adapter (json/sqlite/postgres)", ["json", "sqlite", "postgres"], "json");

  const dataPath = await ask("DATA_PATH (json)", "./content");
  const sqlitePath = await ask("SQLITE_PATH (sqlite)", "./data/blog.db");
  let databaseUrl = await ask("DATABASE_URL (postgres)", "");
  if (adapter === "postgres") {
    while (!databaseUrl) {
      console.log("DATABASE_URL is required for the postgres adapter.");
      databaseUrl = await ask("DATABASE_URL (postgres)", "");
    }
  }

  const aiApiKey = await ask("AI API key", "");

  const envLines = [
    "# Runtime",
    `NEXT_PUBLIC_BUILD_MODE=${formatValue(buildMode)}`,
    `PORT=${formatValue(frontendPort)}`,
    `AUTHOR_PORT=${formatValue(backendPort)}`,
    `NEXT_PUBLIC_AUTHOR_API_BASE_URL=${formatValue(`http://localhost:${backendPort}`)}`,
    "",
    "# Storage",
    `DATA_DRIVER=${formatValue(adapter)}`,
    `DATA_PATH=${formatValue(dataPath)}`,
    `SQLITE_PATH=${formatValue(sqlitePath)}`,
    `DATABASE_URL=${formatValue(databaseUrl)}`,
    "",
    "# AI",
    `AI_API_KEY=${formatValue(aiApiKey)}`,
    ""
  ];

  await fs.writeFile(envPath, `${envLines.join("\n")}\n`, "utf8");
  console.log(`Saved ${envPath}`);
  rl.close();
}

main().catch((err) => {
  console.error("Failed to write .env", err);
  rl.close();
  process.exit(1);
});
