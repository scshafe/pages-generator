const baseUrl = process.env.SMOKE_API_BASE_URL || "http://localhost:4001";

async function api(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  const stamp = Date.now();
  const path = `/smoke-${stamp}`;
  const mirrorPath = `/smoke-${stamp}-mirror`;
  const copyPath = `/smoke-${stamp}-copy`;

  const created = await api("/views", {
    method: "POST",
    body: JSON.stringify({ path, title: `Smoke ${stamp}` })
  });

  if (!created.node_id) {
    throw new Error("Create view did not return node_id");
  }

  await api(`/nodes/${created.node_id}/children`, {
    method: "POST",
    body: JSON.stringify({
      component_type: "SectionUnit",
      config: { text: "Smoke section", level: "h2" }
    })
  });

  const mirrored = await api(`/views/${created.node_id}/mirror`, {
    method: "POST",
    body: JSON.stringify({ path: mirrorPath, title: `Mirror ${stamp}` })
  });

  const detached = await api(`/views/${mirrored.node_id}/detach`, {
    method: "POST"
  });

  const duplicated = await api(`/views/${created.node_id}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ path: copyPath, title: `Copy ${stamp}` })
  });

  await api(`/views/${duplicated.node_id}`, { method: "DELETE" });
  await api(`/views/${detached.node_id}`, { method: "DELETE" });
  await api(`/views/${created.node_id}`, { method: "DELETE" });

  console.log("View flow smoke test passed");
}

main().catch((err) => {
  console.error("View flow smoke test failed", err);
  process.exit(1);
});
