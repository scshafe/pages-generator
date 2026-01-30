from __future__ import annotations

from typing import Any

from .database import (
    find_component,
    node_path,
    read_json,
    reference_path,
)
def resolve_node_tree(node_id: int) -> dict[str, Any] | None:
    node = read_json(node_path(node_id))
    if not node:
        return None
    reference = read_json(reference_path(node["ref_id"]))
    if not reference:
        return None
    component = find_component(reference["comp_id"])
    if not component:
        return None

    config = {**component.get("config", {}), **(reference.get("overrides") or {})}
    resolved = {
        "node": node,
        "reference": reference,
        "component": component,
        "config": config,
        "children": [],
    }

    child_node_id = component.get("config", {}).get("child_node_id")
    if child_node_id:
        cursor = child_node_id
        while cursor:
            child_resolved = resolve_node_tree(cursor)
            if child_resolved:
                resolved["children"].append(child_resolved)
            cursor_node = read_json(node_path(cursor))
            cursor = cursor_node.get("next_node_id") if cursor_node else None

    return resolved
