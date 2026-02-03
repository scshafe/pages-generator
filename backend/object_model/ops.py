from __future__ import annotations

import copy
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..database import (
    HOME_FILE,
    REFERENCE_DIR,
    VIEW_STYLES_FILE,
    component_path,
    ensure_dirs,
    find_component,
    generate_id,
    node_path,
    now_iso,
    read_home_settings,
    read_json,
    read_view_styles,
    reference_path,
    write_json,
)

from .diff import build_changes
from .undo import build_undo
from .validators import (
    is_container_component,
    is_list_compatible,
    is_view_container,
    merge_config,
    resolve_group_kind,
)


class OperationError(ValueError):
    pass


@dataclass
class Mutation:
    path: Path
    before: Any | None
    after: Any | None


class MutationPlan:
    def __init__(self) -> None:
        self.mutations: dict[Path, Mutation] = {}
        self.created_components: dict[int, str] = {}
        self.created_nodes: set[int] = set()
        self.created_refs: set[int] = set()

    def read(self, path: Path, default: Any | None = None) -> Any:
        mutation = self.mutations.get(path)
        if mutation is not None:
            return mutation.after
        return read_json(path, default)

    def read_with_default(self, path: Path, default: Any) -> Any:
        mutation = self.mutations.get(path)
        if mutation is not None:
            return mutation.after
        return default

    def stage_write(self, path: Path, data: Any) -> None:
        existing = self.mutations.get(path)
        before = existing.before if existing else _clone(read_json(path))
        self.mutations[path] = Mutation(path=path, before=before, after=_clone(data))

    def stage_delete(self, path: Path) -> None:
        existing = self.mutations.get(path)
        before = existing.before if existing else _clone(read_json(path))
        self.mutations[path] = Mutation(path=path, before=before, after=None)

    def apply(self) -> None:
        for mutation in self.sorted_mutations():
            if mutation.after is None:
                mutation.path.unlink(missing_ok=True)
            else:
                write_json(mutation.path, mutation.after)

    def sorted_mutations(self) -> list[Mutation]:
        return sorted(self.mutations.values(), key=lambda mutation: str(mutation.path))


RESERVED_VIEW_PATHS = ["/settings", "/feed.xml", "/api"]


def apply_operations(operations: list[dict[str, Any]], dry_run: bool = False) -> dict[str, Any]:
    ensure_dirs()
    plan = MutationPlan()
    results: list[dict[str, Any]] = []
    resolved_ops: list[dict[str, Any]] = []

    for op in operations:
        if not isinstance(op, dict):
            raise OperationError("Operation must be an object")
        op_type = op.get("type")
        payload = op.get("payload") or {}
        if not op_type or not isinstance(payload, dict):
            raise OperationError("Operation must include type and payload")

        if op_type == "create_child":
            result, resolved_payload = _create_child(plan, payload)
        elif op_type == "create_view":
            result, resolved_payload = _create_view(plan, payload)
        elif op_type == "reparent_node":
            result, resolved_payload = _reparent_node(plan, payload)
        elif op_type == "delete_node":
            result, resolved_payload = _delete_node(plan, payload)
        elif op_type == "update_view":
            result, resolved_payload = _update_view(plan, payload)
        elif op_type == "set_home_root_view":
            result, resolved_payload = _set_home_root_view(plan, payload)
        elif op_type == "update_view_styles":
            result, resolved_payload = _update_view_styles(plan, payload)
        elif op_type == "update_component":
            result, resolved_payload = _update_component(plan, payload)
        elif op_type == "update_reference":
            result, resolved_payload = _update_reference(plan, payload)
        else:
            raise OperationError(f"Unknown operation type: {op_type}")

        results.append({"type": op_type, **result})
        resolved_ops.append({"type": op_type, "payload": resolved_payload})

    mutations = plan.sorted_mutations()
    changes = build_changes(mutations)
    undo = build_undo(mutations)

    if not dry_run:
        plan.apply()

    return {
        "operations": resolved_ops,
        "results": results,
        "changes": changes,
        "undo": undo,
    }


def _create_child(plan: MutationPlan, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    parent_node_id = _require(payload, "parent_node_id")
    component_type = _require(payload, "component_type")
    raw_config = payload.get("config")
    config: dict[str, Any] = raw_config if isinstance(raw_config, dict) else {}
    overrides = payload.get("overrides")
    before_node_id = payload.get("before_node_id")

    parent_node = plan.read(node_path(parent_node_id))
    if not parent_node:
        raise OperationError("Parent node not found")

    parent_ref_id = parent_node.get("ref_id")
    if not parent_ref_id:
        raise OperationError("Parent reference not found")
    parent_ref = plan.read(reference_path(parent_ref_id))
    if not parent_ref:
        raise OperationError("Parent reference not found")
    parent_comp = _read_component(plan, parent_ref.get("comp_id"))
    if not parent_comp or not is_container_component(parent_comp):
        raise OperationError("Parent component is not a container")

    if component_type == "Group":
        if not config.get("group_kind"):
            config["group_kind"] = "inline"
        if config.get("group_kind") == "style" and "isTransparent" not in config:
            config["isTransparent"] = False

    target_config = merge_config(parent_comp, parent_ref)
    if resolve_group_kind(parent_comp) == "list":
        list_type = target_config.get("listType")
        if not is_list_compatible(str(list_type) if list_type else None, str(component_type)):
            raise OperationError("Incompatible list item type")

    comp_id = payload.get("comp_id") or generate_id()
    ref_id = payload.get("ref_id") or generate_id()
    node_id = payload.get("node_id") or generate_id()

    use_ai = _derive_use_ai(payload.get("useAI"), config)

    component = {
        "comp_id": comp_id,
        "type": component_type,
        "config": config,
        "reference_count": 1,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    plan.stage_write(component_path(component_type, comp_id), component)
    plan.created_components[comp_id] = component_type

    reference = {
        "ref_id": ref_id,
        "node_id": node_id,
        "comp_id": comp_id,
        "overrides": overrides,
        "useAI": use_ai,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    plan.stage_write(reference_path(ref_id), reference)
    plan.created_refs.add(ref_id)

    child_node = {
        "node_id": node_id,
        "ref_id": ref_id,
        "parent_node_id": parent_node_id,
        "previous_node_id": None,
        "next_node_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    if before_node_id:
        _insert_before(plan, parent_comp, parent_node_id, before_node_id, child_node)
    else:
        _append_to_parent(plan, parent_comp, child_node)

    plan.stage_write(node_path(node_id), child_node)
    plan.created_nodes.add(node_id)

    resolved_payload = dict(payload)
    resolved_payload.update({"node_id": node_id, "ref_id": ref_id, "comp_id": comp_id})
    return {"node_id": node_id, "ref_id": ref_id, "comp_id": comp_id}, resolved_payload


def _create_view(plan: MutationPlan, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    path_value = _require(payload, "path")
    title = payload.get("title") or "Untitled"
    name = payload.get("name") or title
    description = payload.get("description")
    order = payload.get("order", 0)
    browser_title = payload.get("browser_title") or title

    if not isinstance(path_value, str):
        path_value = str(path_value)
    if not path_value:
        raise OperationError("path is required")
    if not path_value.startswith("/"):
        raise OperationError("path must start with /")
    _ensure_view_path_available(plan, path_value)

    comp_id = payload.get("comp_id") or generate_id()
    ref_id = payload.get("ref_id") or generate_id()
    node_id = payload.get("node_id") or generate_id()

    component = {
        "comp_id": comp_id,
        "type": "Container",
        "config": {
            "path": path_value,
            "name": name,
            "title": title,
            "browser_title": browser_title,
            "description": description,
            "child_node_id": None,
            "order": order,
        },
        "reference_count": 1,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    plan.stage_write(component_path("Container", comp_id), component)
    plan.created_components[comp_id] = "Container"

    reference = {
        "ref_id": ref_id,
        "node_id": node_id,
        "comp_id": comp_id,
        "overrides": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    plan.stage_write(reference_path(ref_id), reference)
    plan.created_refs.add(ref_id)

    node = {
        "node_id": node_id,
        "ref_id": ref_id,
        "parent_node_id": None,
        "previous_node_id": None,
        "next_node_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    plan.stage_write(node_path(node_id), node)
    plan.created_nodes.add(node_id)

    set_root_if_empty = payload.get("set_root_if_empty", True)
    if set_root_if_empty:
        home = plan.read(HOME_FILE)
        if not home:
            home = read_home_settings()
        if home.get("root_view_node_id") is None:
            home["root_view_node_id"] = node_id
            plan.stage_write(HOME_FILE, home)

    resolved_payload = dict(payload)
    resolved_payload.update({"node_id": node_id, "ref_id": ref_id, "comp_id": comp_id})
    return {"node_id": node_id, "ref_id": ref_id, "comp_id": comp_id}, resolved_payload


def _reparent_node(plan: MutationPlan, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    node_id = _require(payload, "node_id")
    target_parent_id = _require(payload, "target_parent_node_id")
    before_node_id = payload.get("before_node_id")

    node = plan.read(node_path(node_id))
    if not node:
        raise OperationError("Node not found")

    target_parent = plan.read(node_path(target_parent_id))
    if not target_parent:
        raise OperationError("Target parent not found")

    _ensure_not_descendant(plan, node_id, target_parent_id)

    target_ref = plan.read(reference_path(target_parent.get("ref_id"))) if target_parent.get("ref_id") else None
    target_comp = _read_component(plan, target_ref.get("comp_id")) if target_ref else None
    if not target_comp or not is_container_component(target_comp):
        raise OperationError("Target parent is not a container")

    node_ref = plan.read(reference_path(node.get("ref_id"))) if node.get("ref_id") else None
    node_comp = _read_component(plan, node_ref.get("comp_id")) if node_ref else None
    if not node_comp:
        raise OperationError("Node component not found")

    target_config = merge_config(target_comp, target_ref)
    if resolve_group_kind(target_comp) == "list":
        list_type = target_config.get("listType")
        if not is_list_compatible(str(list_type) if list_type else None, str(node_comp.get("type"))):
            raise OperationError("Incompatible list item type")

    _unlink_from_parent(plan, node)

    node["parent_node_id"] = target_parent_id
    node["previous_node_id"] = None
    node["next_node_id"] = None
    node["updated_at"] = now_iso()

    if before_node_id:
        _insert_before(plan, target_comp, target_parent_id, before_node_id, node)
    else:
        _append_to_parent(plan, target_comp, node)

    plan.stage_write(node_path(node_id), node)

    return {"node_id": node_id, "target_parent_node_id": target_parent_id}, dict(payload)


def _delete_node(plan: MutationPlan, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    node_id = _require(payload, "node_id")
    node = plan.read(node_path(node_id))
    if not node:
        raise OperationError("Node not found")

    _unlink_from_parent(plan, node)

    ref_id = node.get("ref_id")
    plan.stage_delete(node_path(node_id))
    if ref_id:
        plan.stage_delete(reference_path(ref_id))

    return {"node_id": node_id}, dict(payload)


def _update_component(plan: MutationPlan, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    comp_id = _require(payload, "comp_id")
    component_type = _require(payload, "component_type")
    config = payload.get("config")
    if not isinstance(config, dict):
        raise OperationError("config must be an object")

    component = plan.read(component_path(component_type, comp_id))
    if not component:
        existing = find_component(comp_id)
        if not existing:
            raise OperationError("Component not found")
        if existing.get("type") != component_type:
            raise OperationError("Component type mismatch")
        component = existing

    if component.get("type") != component_type:
        raise OperationError("Component type mismatch")

    if component_type == "Container" and "path" in config:
        next_path = config.get("path")
        if next_path is not None:
            if not isinstance(next_path, str):
                next_path = str(next_path)
            if not next_path.startswith("/"):
                raise OperationError("path must start with /")
            _ensure_view_path_available(plan, next_path, exclude_comp_id=comp_id)

    replace = bool(payload.get("replace"))
    next_config = config if replace else {**component.get("config", {}), **config}
    component["config"] = next_config
    component["updated_at"] = now_iso()
    plan.stage_write(component_path(component_type, comp_id), component)

    return {"comp_id": comp_id, "component_type": component_type}, dict(payload)


def _update_reference(plan: MutationPlan, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    ref_id = _require(payload, "ref_id")
    reference = plan.read(reference_path(ref_id))
    if not reference:
        raise OperationError("Reference not found")

    overrides = payload.get("overrides")
    use_ai = payload.get("useAI")
    replace_overrides = bool(payload.get("replace_overrides"))

    if overrides is not None:
        if not isinstance(overrides, dict):
            raise OperationError("overrides must be an object")
        if replace_overrides:
            reference["overrides"] = overrides
        else:
            reference["overrides"] = {**(reference.get("overrides") or {}), **overrides}

    if use_ai is not None:
        reference["useAI"] = bool(use_ai)

    reference["updated_at"] = now_iso()
    plan.stage_write(reference_path(ref_id), reference)

    return {"ref_id": ref_id}, dict(payload)


def _update_view(plan: MutationPlan, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    comp_id = payload.get("comp_id")
    node_id = payload.get("node_id")
    if not comp_id:
        if not node_id:
            raise OperationError("comp_id or node_id is required")
        node = plan.read(node_path(node_id))
        if not node:
            raise OperationError("Node not found")
        reference = plan.read(reference_path(node.get("ref_id"))) if node.get("ref_id") else None
        if not reference:
            raise OperationError("Reference not found")
        comp_id = reference.get("comp_id")
        if not comp_id:
            raise OperationError("Component not found")

    component = _read_component(plan, comp_id)
    if not component or component.get("type") != "Container":
        raise OperationError("View component not found")
    if not is_view_container(component):
        raise OperationError("Component is not a view container")

    config_updates: dict[str, Any] = {}
    payload_config = payload.get("config")
    if isinstance(payload_config, dict):
        config_updates.update(payload_config)
    for key in ["path", "title", "name", "browser_title", "description", "order"]:
        if key in payload:
            config_updates[key] = payload.get(key)

    if not config_updates:
        raise OperationError("No view config updates provided")

    if "path" in config_updates:
        next_path = config_updates.get("path")
        if next_path is not None:
            if not isinstance(next_path, str):
                next_path = str(next_path)
            if not next_path.startswith("/"):
                raise OperationError("path must start with /")
            _ensure_view_path_available(plan, next_path, exclude_comp_id=comp_id)

    replace = bool(payload.get("replace"))
    next_config = config_updates if replace else {**component.get("config", {}), **config_updates}
    component["config"] = next_config
    component["updated_at"] = now_iso()
    plan.stage_write(component_path(component["type"], component["comp_id"]), component)

    resolved_payload = dict(payload)
    resolved_payload["comp_id"] = comp_id
    return {"comp_id": comp_id}, resolved_payload


def _set_home_root_view(plan: MutationPlan, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    root_view_node_id = payload.get("root_view_node_id")
    home = plan.read(HOME_FILE)
    if not home:
        home = read_home_settings()
    home["root_view_node_id"] = root_view_node_id
    plan.stage_write(HOME_FILE, home)
    return {"root_view_node_id": root_view_node_id}, dict(payload)


def _update_view_styles(plan: MutationPlan, payload: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    updates = payload.get("styles") if isinstance(payload.get("styles"), dict) else payload
    if not isinstance(updates, dict):
        raise OperationError("styles must be an object")
    styles = plan.read(VIEW_STYLES_FILE)
    if not styles:
        styles = read_view_styles()
    styles.update(updates)
    plan.stage_write(VIEW_STYLES_FILE, styles)
    return {"styles": styles}, dict(payload)


def _derive_use_ai(explicit: Any, config: dict[str, Any]) -> bool:
    if explicit is not None:
        return bool(explicit)
    value = config.get("useAI")
    if isinstance(value, str):
        return value.lower() == "true"
    return bool(value)


def _append_to_parent(plan: MutationPlan, parent_comp: dict[str, Any], child_node: dict[str, Any]) -> None:
    head_id = parent_comp.get("config", {}).get("child_node_id")
    if not head_id:
        parent_comp.setdefault("config", {})["child_node_id"] = child_node["node_id"]
        parent_comp["updated_at"] = now_iso()
        plan.stage_write(component_path(parent_comp["type"], parent_comp["comp_id"]), parent_comp)
        return

    cursor_id = head_id
    while cursor_id:
        cursor_node = plan.read(node_path(cursor_id))
        if not cursor_node:
            break
        if not cursor_node.get("next_node_id"):
            cursor_node["next_node_id"] = child_node["node_id"]
            cursor_node["updated_at"] = now_iso()
            plan.stage_write(node_path(cursor_id), cursor_node)
            child_node["previous_node_id"] = cursor_id
            return
        cursor_id = cursor_node.get("next_node_id")


def _insert_before(
    plan: MutationPlan,
    parent_comp: dict[str, Any],
    parent_node_id: int,
    before_node_id: int,
    child_node: dict[str, Any],
) -> None:
    before_node = plan.read(node_path(before_node_id))
    if not before_node or before_node.get("parent_node_id") != parent_node_id:
        raise OperationError("before_node_id is not in target container")

    prev_id = before_node.get("previous_node_id")
    child_node["next_node_id"] = before_node_id
    child_node["previous_node_id"] = prev_id
    before_node["previous_node_id"] = child_node["node_id"]
    before_node["updated_at"] = now_iso()
    plan.stage_write(node_path(before_node_id), before_node)

    if prev_id:
        prev_node = plan.read(node_path(prev_id))
        if prev_node:
            prev_node["next_node_id"] = child_node["node_id"]
            prev_node["updated_at"] = now_iso()
            plan.stage_write(node_path(prev_id), prev_node)
    else:
        parent_comp.setdefault("config", {})["child_node_id"] = child_node["node_id"]
        parent_comp["updated_at"] = now_iso()
        plan.stage_write(component_path(parent_comp["type"], parent_comp["comp_id"]), parent_comp)


def _unlink_from_parent(plan: MutationPlan, node: dict[str, Any]) -> None:
    prev_id = node.get("previous_node_id")
    next_id = node.get("next_node_id")
    parent_id = node.get("parent_node_id")

    if prev_id:
        prev_node = plan.read(node_path(prev_id))
        if prev_node:
            prev_node["next_node_id"] = next_id
            prev_node["updated_at"] = now_iso()
            plan.stage_write(node_path(prev_id), prev_node)
    if next_id:
        next_node = plan.read(node_path(next_id))
        if next_node:
            next_node["previous_node_id"] = prev_id
            next_node["updated_at"] = now_iso()
            plan.stage_write(node_path(next_id), next_node)

    if parent_id and not prev_id:
        parent_node = plan.read(node_path(parent_id))
        if parent_node:
            parent_ref = plan.read(reference_path(parent_node.get("ref_id"))) if parent_node.get("ref_id") else None
            parent_comp = _read_component(plan, parent_ref.get("comp_id")) if parent_ref else None
            if parent_comp and parent_comp.get("config", {}).get("child_node_id") == node.get("node_id"):
                parent_comp.setdefault("config", {})["child_node_id"] = next_id
                parent_comp["updated_at"] = now_iso()
                plan.stage_write(component_path(parent_comp["type"], parent_comp["comp_id"]), parent_comp)


def _ensure_not_descendant(plan: MutationPlan, node_id: int, target_parent_id: int) -> None:
    cursor = plan.read(node_path(target_parent_id))
    while cursor:
        if cursor.get("node_id") == node_id:
            raise OperationError("Cannot reparent into descendant")
        parent_id = cursor.get("parent_node_id")
        cursor = plan.read(node_path(parent_id)) if parent_id else None


def _read_component(plan: MutationPlan, comp_id: int | None) -> dict[str, Any] | None:
    if not comp_id:
        return None
    if comp_id in plan.created_components:
        comp_type = plan.created_components[comp_id]
        return plan.read(component_path(comp_type, comp_id))
    component = find_component(comp_id)
    if not component:
        return None
    comp_type = component.get("type")
    if not comp_type:
        return component
    return plan.read_with_default(component_path(comp_type, comp_id), component)


def _require(payload: dict[str, Any], key: str) -> Any:
    value = payload.get(key)
    if value is None:
        raise OperationError(f"{key} is required")
    return value


def _clone(value: Any) -> Any:
    return copy.deepcopy(value)


def _is_reserved_view_path(path_value: str) -> bool:
    if path_value == "/":
        return True
    for prefix in RESERVED_VIEW_PATHS:
        if path_value == prefix or path_value.startswith(f"{prefix}/"):
            return True
    return False


def _ensure_view_path_available(
    plan: MutationPlan,
    path_value: str,
    exclude_comp_id: int | None = None,
) -> None:
    if _is_reserved_view_path(path_value):
        raise OperationError("path is reserved")
    for view in _list_views(plan):
        if view.get("config", {}).get("path") != path_value:
            continue
        if exclude_comp_id is not None and view.get("comp_id") == exclude_comp_id:
            continue
        raise OperationError("path already exists")


def _list_views(plan: MutationPlan) -> list[dict[str, Any]]:
    views: list[dict[str, Any]] = []
    for ref in _iter_reference_records(plan):
        comp_id = ref.get("comp_id")
        component = _read_component(plan, comp_id)
        if not component or not is_view_container(component):
            continue
        views.append(
            {
                "comp_id": component.get("comp_id"),
                "ref_id": ref.get("ref_id"),
                "config": merge_config(component, ref),
            }
        )
    return views


def _iter_reference_records(plan: MutationPlan) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    seen_paths: set[Path] = set()
    if REFERENCE_DIR.exists():
        for ref_path in REFERENCE_DIR.glob("*.json"):
            seen_paths.add(ref_path)
            mutation = plan.mutations.get(ref_path)
            if mutation is None:
                record = read_json(ref_path)
            else:
                if mutation.after is None:
                    continue
                record = mutation.after
            if record:
                records.append(record)

    for path, mutation in plan.mutations.items():
        if path in seen_paths:
            continue
        if path.parent != REFERENCE_DIR:
            continue
        if mutation.after is None:
            continue
        records.append(mutation.after)

    return records
