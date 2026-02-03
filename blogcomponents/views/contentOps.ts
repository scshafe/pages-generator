import { apiFetch } from "@/lib/api/client";
import type { NodeRecord } from "@/lib/content/types";

export async function createChildNode(
  parentId: number,
  componentType: string,
  config: Record<string, unknown>
) {
  return apiFetch<NodeRecord>(`/nodes/${parentId}/children`, {
    method: "POST",
    body: JSON.stringify({ component_type: componentType, config })
  });
}

export async function reparentNode(
  nodeId: number,
  parentId: number,
  beforeNodeId?: number | null,
  options?: { skipIfMissing?: boolean }
) {
  if (!beforeNodeId && options?.skipIfMissing) return;
  const payload: { target_parent_node_id: number; before_node_id?: number } = {
    target_parent_node_id: parentId
  };
  if (beforeNodeId) {
    payload.before_node_id = beforeNodeId;
  }
  await apiFetch(`/nodes/${nodeId}/reparent`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}
