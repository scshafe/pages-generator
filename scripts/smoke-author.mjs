const baseUrl = process.env.SMOKE_API_BASE_URL || "http://localhost:4001";
const endpoints = ["/health", "/home", "/navigation", "/views"];

async function checkEndpoint(path) {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    throw new Error(`${path} failed with ${res.status}`);
  }
  return res.json();
}

async function main() {
  try {
    for (const path of endpoints) {
      await checkEndpoint(path);
    }
    console.log("Author smoke test passed");
  } catch (err) {
    console.error("Author smoke test failed", err);
    process.exit(1);
  }
}

main();
