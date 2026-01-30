import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

async function main() {
  const filePath = path.join(process.cwd(), "content", "metadata.json");
  if (!existsSync(filePath)) {
    console.error("metadata.json not found. Run npm run export:metadata first.");
    process.exit(1);
  }
  const raw = await readFile(filePath, "utf-8");
  const data = JSON.parse(raw);
  const required = ["nodes", "references", "components", "settings"];
  const missing = required.filter((key) => !(key in data));
  if (missing.length) {
    console.error(`metadata.json missing keys: ${missing.join(", ")}`);
    process.exit(1);
  }
  console.log("Export smoke test passed");
}

main().catch((err) => {
  console.error("Export smoke test failed", err);
  process.exit(1);
});
