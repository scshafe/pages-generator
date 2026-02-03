from __future__ import annotations

from typing import Any


def merge_config(component: dict[str, Any], reference: dict[str, Any] | None) -> dict[str, Any]:
    overrides = reference.get("overrides") if reference else None
    config = component.get("config", {})
    if not overrides:
        return dict(config)
    merged = {**config, **overrides}
    return merged


def resolve_group_kind(component: dict[str, Any]) -> str | None:
    if component.get("type") != "Group":
        return None
    kind = component.get("config", {}).get("group_kind")
    if kind in {"list", "inline", "style"}:
        return kind
    return "inline"


def is_container_component(component: dict[str, Any]) -> bool:
    return component.get("type") in {"Container", "Group"}


def is_view_container(component: dict[str, Any]) -> bool:
    if component.get("type") != "Container":
        return False
    path_value = component.get("config", {}).get("path")
    return isinstance(path_value, str) and len(path_value) > 0


def is_list_compatible(list_type: str | None, child_type: str) -> bool:
    if not list_type:
        return True
    if list_type == "View":
        return child_type == "LinkUnit"
    return True
