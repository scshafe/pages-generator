from __future__ import annotations

import json
import os
import mimetypes
from urllib.parse import urlparse
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from werkzeug.utils import secure_filename

try:
    from .database import (
        COMPONENT_DIR,
        FOOTER_DIR,
        HOME_FILE,
        MENU_DIR,
        NODE_DIR,
        REFERENCE_DIR,
        THEME_CUSTOM_DIR,
        THEME_CONFIG,
        component_path,
        ensure_dirs,
        generate_id,
        find_component,
        list_components,
        list_json_files,
        node_path,
        now_iso,
        read_home_settings,
        read_json,
        read_theme_config,
        reference_path,
        write_home_settings,
        write_json,
        write_theme_config,
    )
    from .export_metadata import export_metadata
    from .utils import resolve_node_tree
except ImportError:
    from backend.database import (
        COMPONENT_DIR,
        FOOTER_DIR,
        HOME_FILE,
        MENU_DIR,
        NODE_DIR,
        REFERENCE_DIR,
        THEME_CUSTOM_DIR,
        THEME_CONFIG,
        component_path,
        ensure_dirs,
        generate_id,
        find_component,
        list_components,
        list_json_files,
        node_path,
        now_iso,
        read_home_settings,
        read_json,
        read_theme_config,
        reference_path,
        write_home_settings,
        write_json,
        write_theme_config,
    )
    from backend.export_metadata import export_metadata
    from backend.utils import resolve_node_tree

app = Flask(__name__)
CORS(app)

ensure_dirs()

RESERVED_VIEW_PATHS = ["/settings", "/feed.xml", "/api"]


def _is_reserved_view_path(path_value: str) -> bool:
    if path_value == "/":
        return True
    for prefix in RESERVED_VIEW_PATHS:
        if path_value == prefix or path_value.startswith(f"{prefix}/"):
            return True
    return False


def _save_image_bytes(data: bytes, filename: str) -> str:
    uploads_dir = Path("public") / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    safe_name = secure_filename(filename)
    if not safe_name:
        safe_name = "upload.bin"

    unique_name = f"{generate_id()}_{safe_name}"
    file_path = uploads_dir / unique_name
    file_path.write_bytes(data)
    return f"/uploads/{unique_name}"


def _validate_upload(filename: str, data: bytes, allowed_prefixes: list[str]) -> tuple[bool, str | None]:
    max_size = 20 * 1024 * 1024
    if len(data) > max_size:
        return False, "File is larger than 20MB"
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        return False, "Unknown file type"
    if not any(mime_type.startswith(prefix) for prefix in allowed_prefixes):
        return False, "Unsupported file type"
    return True, None


def _list_uploads() -> list[dict[str, Any]]:
    uploads_dir = Path("public") / "uploads"
    if not uploads_dir.exists():
        return []
    assets = []
    for file_path in sorted(uploads_dir.iterdir()):
        if not file_path.is_file():
            continue
        mime_type, _ = mimetypes.guess_type(file_path.name)
        assets.append(
            {
                "name": file_path.name,
                "src": f"/uploads/{file_path.name}",
                "mime": mime_type or "application/octet-stream",
                "size": file_path.stat().st_size,
            }
        )
    return assets


def _merge_config(component: dict[str, Any], reference: dict[str, Any]) -> dict[str, Any]:
    overrides = reference.get("overrides") or {}
    config = component.get("config", {})
    merged = {**config, **overrides}
    return merged


def _list_views() -> list[dict[str, Any]]:
    references = list_json_files(REFERENCE_DIR)
    views = []
    for ref in references:
        comp_id = ref.get("comp_id")
        component = find_component(comp_id) if comp_id else None
        if not component or component.get("type") != "ViewContainer":
            continue
        views.append(
            {
                "comp_id": component.get("comp_id"),
                "ref_id": ref.get("ref_id"),
                "node_id": ref.get("node_id"),
                "config": _merge_config(component, ref),
            }
        )
    return views


def _resolve_view_path(node_id: int | None, nodes: dict[int, dict[str, Any]], view_paths: dict[int, str]) -> str | None:
    cursor = node_id
    while cursor:
        if cursor in view_paths:
            return view_paths[cursor]
        node = nodes.get(cursor)
        cursor = node.get("parent_node_id") if node else None
    return None


def _is_container_component(component: dict[str, Any]) -> bool:
    return component.get("type") in {"ViewContainer", "ListContainer", "InlineContainer", "StyleContainer"}


def _is_list_compatible(list_type: str | None, child_type: str) -> bool:
    if not list_type:
        return True
    if list_type == "View":
        return child_type == "LinkUnit"
    return True


@app.get("/health")
def health() -> tuple[Any, int]:
    return jsonify({"status": "ok"}), 200


@app.get("/nodes")
def list_nodes() -> tuple[Any, int]:
    return jsonify(list_json_files(NODE_DIR)), 200


@app.post("/nodes")
def create_node() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    node_id = payload.get("node_id") or generate_id()
    node = {
        "node_id": node_id,
        "ref_id": payload.get("ref_id"),
        "parent_node_id": payload.get("parent_node_id"),
        "previous_node_id": payload.get("previous_node_id"),
        "next_node_id": payload.get("next_node_id"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    if node["ref_id"] is None:
        return jsonify({"error": "ref_id is required"}), 400
    write_json(node_path(node_id), node)
    return jsonify(node), 201


@app.get("/nodes/<int:node_id>")
def get_node(node_id: int) -> tuple[Any, int]:
    node = read_json(node_path(node_id))
    if not node:
        return jsonify({"error": "Node not found"}), 404
    return jsonify(node), 200


@app.put("/nodes/<int:node_id>")
def update_node(node_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    node = read_json(node_path(node_id))
    if not node:
        return jsonify({"error": "Node not found"}), 404
    node.update(payload)
    node["updated_at"] = now_iso()
    write_json(node_path(node_id), node)
    return jsonify(node), 200


@app.delete("/nodes/<int:node_id>")
def delete_node(node_id: int) -> tuple[Any, int]:
    node = read_json(node_path(node_id))
    if not node:
        return jsonify({"error": "Node not found"}), 404
    ref_id = node.get("ref_id")
    parent_id = node.get("parent_node_id")
    prev_id = node.get("previous_node_id")
    next_id = node.get("next_node_id")

    if prev_id:
        prev_node = read_json(node_path(prev_id))
        if prev_node:
            prev_node["next_node_id"] = next_id
            prev_node["updated_at"] = now_iso()
            write_json(node_path(prev_id), prev_node)

    if next_id:
        next_node = read_json(node_path(next_id))
        if next_node:
            next_node["previous_node_id"] = prev_id
            next_node["updated_at"] = now_iso()
            write_json(node_path(next_id), next_node)

    if parent_id and not prev_id:
        parent_node = read_json(node_path(parent_id))
        if parent_node:
            parent_ref = read_json(reference_path(parent_node.get("ref_id")))
            parent_comp = find_component(parent_ref.get("comp_id")) if parent_ref else None
            if parent_comp and parent_comp.get("config", {}).get("child_node_id") == node_id:
                parent_comp["config"]["child_node_id"] = next_id
                parent_comp["updated_at"] = now_iso()
                write_json(
                    component_path(parent_comp["type"], parent_comp["comp_id"]),
                    parent_comp
                )
    node_path(node_id).unlink(missing_ok=True)
    if ref_id:
        reference_path(ref_id).unlink(missing_ok=True)
    return jsonify({"deleted": node_id}), 200


@app.post("/nodes/<int:node_id>/children")
def add_child(node_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    component_type = payload.get("component_type")
    config = payload.get("config", {})
    overrides = payload.get("overrides")

    if not component_type:
        return jsonify({"error": "component_type is required"}), 400

    parent_node = read_json(node_path(node_id))
    if not parent_node:
        return jsonify({"error": "Parent node not found"}), 404

    # Create component
    comp_id = generate_id()
    component = {
        "comp_id": comp_id,
        "type": component_type,
        "config": config,
        "reference_count": 1,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(component_path(component_type, comp_id), component)

    # Create reference
    ref_id = generate_id()
    reference = {
        "ref_id": ref_id,
        "node_id": None,
        "comp_id": comp_id,
        "overrides": overrides,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(reference_path(ref_id), reference)

    # Create node
    child_node_id = generate_id()
    child_node = {
        "node_id": child_node_id,
        "ref_id": ref_id,
        "parent_node_id": node_id,
        "previous_node_id": None,
        "next_node_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(node_path(child_node_id), child_node)

    reference["node_id"] = child_node_id
    write_json(reference_path(ref_id), reference)

    # Attach to parent container's linked list
    parent_reference = read_json(reference_path(parent_node["ref_id"]))
    parent_component = find_component(parent_reference["comp_id"]) if parent_reference else None

    child_head = parent_component.get("config", {}).get("child_node_id") if parent_component else None
    if child_head is None and parent_component:
        parent_component["config"]["child_node_id"] = child_node_id
        write_json(component_path(parent_component["type"], parent_component["comp_id"]), parent_component)
    else:
        cursor = child_head
        while cursor:
            cursor_node = read_json(node_path(cursor))
            if not cursor_node.get("next_node_id"):
                cursor_node["next_node_id"] = child_node_id
                cursor_node["updated_at"] = now_iso()
                write_json(node_path(cursor), cursor_node)
                child_node["previous_node_id"] = cursor
                write_json(node_path(child_node_id), child_node)
                break
            cursor = cursor_node.get("next_node_id")

    return jsonify(child_node), 201


@app.post("/nodes/<int:node_id>/children/mirror")
def add_mirror_child(node_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    comp_id = payload.get("comp_id")
    overrides = payload.get("overrides")

    if not comp_id:
        return jsonify({"error": "comp_id is required"}), 400

    parent_node = read_json(node_path(node_id))
    if not parent_node:
        return jsonify({"error": "Parent node not found"}), 404

    component = find_component(comp_id)
    if not component:
        return jsonify({"error": "Component not found"}), 404

    ref_id = generate_id()
    reference = {
        "ref_id": ref_id,
        "node_id": None,
        "comp_id": comp_id,
        "overrides": overrides,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(reference_path(ref_id), reference)

    child_node_id = generate_id()
    child_node = {
        "node_id": child_node_id,
        "ref_id": ref_id,
        "parent_node_id": node_id,
        "previous_node_id": None,
        "next_node_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(node_path(child_node_id), child_node)

    reference["node_id"] = child_node_id
    write_json(reference_path(ref_id), reference)

    parent_reference = read_json(reference_path(parent_node["ref_id"]))
    parent_component = find_component(parent_reference["comp_id"]) if parent_reference else None

    child_head = parent_component.get("config", {}).get("child_node_id") if parent_component else None
    if child_head is None and parent_component:
        parent_component["config"]["child_node_id"] = child_node_id
        parent_component["updated_at"] = now_iso()
        write_json(component_path(parent_component["type"], parent_component["comp_id"]), parent_component)
    else:
        cursor = child_head
        while cursor:
            cursor_node = read_json(node_path(cursor))
            if not cursor_node.get("next_node_id"):
                cursor_node["next_node_id"] = child_node_id
                cursor_node["updated_at"] = now_iso()
                write_json(node_path(cursor), cursor_node)
                child_node["previous_node_id"] = cursor
                write_json(node_path(child_node_id), child_node)
                break
            cursor = cursor_node.get("next_node_id")

    component["reference_count"] = int(component.get("reference_count", 0)) + 1
    component["updated_at"] = now_iso()
    write_json(component_path(component["type"], component["comp_id"]), component)

    return jsonify(child_node), 201


@app.put("/nodes/<int:node_id>/reparent")
def reparent_node(node_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    target_parent_id = payload.get("target_parent_node_id")
    before_node_id = payload.get("before_node_id")

    if not target_parent_id:
        return jsonify({"error": "target_parent_node_id is required"}), 400

    node = read_json(node_path(node_id))
    if not node:
        return jsonify({"error": "Node not found"}), 404

    target_parent = read_json(node_path(target_parent_id))
    if not target_parent:
        return jsonify({"error": "Target parent not found"}), 404

    # Prevent cycles
    cursor = target_parent
    while cursor:
        if cursor.get("node_id") == node_id:
            return jsonify({"error": "Cannot reparent into descendant"}), 400
        parent_id = cursor.get("parent_node_id")
        cursor = read_json(node_path(parent_id)) if parent_id else None

    target_ref = read_json(reference_path(target_parent.get("ref_id"))) if target_parent.get("ref_id") else None
    target_comp = find_component(target_ref.get("comp_id")) if target_ref else None
    if not target_comp or not _is_container_component(target_comp):
        return jsonify({"error": "Target parent is not a container"}), 400

    node_ref = read_json(reference_path(node.get("ref_id"))) if node.get("ref_id") else None
    node_comp = find_component(node_ref.get("comp_id")) if node_ref else None
    if not node_comp:
        return jsonify({"error": "Node component not found"}), 404

    target_config = _merge_config(target_comp, target_ref) if target_ref else target_comp.get("config", {})
    if target_comp.get("type") == "ListContainer":
        list_type = target_config.get("listType")
        if not _is_list_compatible(str(list_type) if list_type else None, str(node_comp.get("type"))):
            return jsonify({"error": "Incompatible list item type"}), 400

    # Unlink from current parent/siblings
    prev_id = node.get("previous_node_id")
    next_id = node.get("next_node_id")
    parent_id = node.get("parent_node_id")

    if prev_id:
        prev_node = read_json(node_path(prev_id))
        if prev_node:
            prev_node["next_node_id"] = next_id
            prev_node["updated_at"] = now_iso()
            write_json(node_path(prev_id), prev_node)
    if next_id:
        next_node = read_json(node_path(next_id))
        if next_node:
            next_node["previous_node_id"] = prev_id
            next_node["updated_at"] = now_iso()
            write_json(node_path(next_id), next_node)
    if parent_id and not prev_id:
        parent_node = read_json(node_path(parent_id))
        if parent_node:
            parent_ref = read_json(reference_path(parent_node.get("ref_id")))
            parent_comp = find_component(parent_ref.get("comp_id")) if parent_ref else None
            if parent_comp and parent_comp.get("config", {}).get("child_node_id") == node_id:
                parent_comp["config"]["child_node_id"] = next_id
                parent_comp["updated_at"] = now_iso()
                write_json(component_path(parent_comp["type"], parent_comp["comp_id"]), parent_comp)

    # Set new parent
    node["parent_node_id"] = target_parent_id
    node["previous_node_id"] = None
    node["next_node_id"] = None
    node["updated_at"] = now_iso()

    # Insert into target list
    head_id = target_comp.get("config", {}).get("child_node_id")
    if before_node_id:
        before_node = read_json(node_path(before_node_id))
        if not before_node or before_node.get("parent_node_id") != target_parent_id:
            return jsonify({"error": "before_node_id is not in target container"}), 400
        prev_in_target = before_node.get("previous_node_id")
        node["next_node_id"] = before_node_id
        node["previous_node_id"] = prev_in_target
        before_node["previous_node_id"] = node_id
        before_node["updated_at"] = now_iso()
        write_json(node_path(before_node_id), before_node)
        if prev_in_target:
            prev_node = read_json(node_path(prev_in_target))
            if prev_node:
                prev_node["next_node_id"] = node_id
                prev_node["updated_at"] = now_iso()
                write_json(node_path(prev_in_target), prev_node)
        else:
            target_comp["config"]["child_node_id"] = node_id
            target_comp["updated_at"] = now_iso()
            write_json(component_path(target_comp["type"], target_comp["comp_id"]), target_comp)
    elif not head_id:
        target_comp["config"]["child_node_id"] = node_id
        target_comp["updated_at"] = now_iso()
        write_json(component_path(target_comp["type"], target_comp["comp_id"]), target_comp)
    else:
        cursor_id = head_id
        while cursor_id:
            cursor_node = read_json(node_path(cursor_id))
            if not cursor_node.get("next_node_id"):
                cursor_node["next_node_id"] = node_id
                cursor_node["updated_at"] = now_iso()
                write_json(node_path(cursor_id), cursor_node)
                node["previous_node_id"] = cursor_id
                break
            cursor_id = cursor_node.get("next_node_id")

    write_json(node_path(node_id), node)
    return jsonify(node), 200


@app.put("/nodes/<int:node_id>/move")
def move_node(node_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    direction = payload.get("direction")

    node = read_json(node_path(node_id))
    if not node:
        return jsonify({"error": "Node not found"}), 404

    parent_id = node.get("parent_node_id")
    parent_comp = None
    if parent_id:
        parent_node = read_json(node_path(parent_id))
        if parent_node:
            parent_ref = read_json(reference_path(parent_node.get("ref_id")))
            parent_comp = find_component(parent_ref.get("comp_id")) if parent_ref else None

    if direction not in {"up", "down"}:
        return jsonify({"error": "direction must be up or down"}), 400

    prev_id = node.get("previous_node_id")
    next_id = node.get("next_node_id")

    if direction == "up" and prev_id:
        prev_node = read_json(node_path(prev_id))
        if not prev_node:
            return jsonify({"error": "Previous node not found"}), 404
        before_prev = prev_node.get("previous_node_id")

        node["previous_node_id"] = before_prev
        node["next_node_id"] = prev_id
        node["updated_at"] = now_iso()

        prev_node["previous_node_id"] = node_id
        prev_node["next_node_id"] = next_id
        prev_node["updated_at"] = now_iso()

        if before_prev:
            before_node = read_json(node_path(before_prev))
            if before_node:
                before_node["next_node_id"] = node_id
                before_node["updated_at"] = now_iso()
                write_json(node_path(before_prev), before_node)
        elif parent_comp and parent_comp.get("config", {}).get("child_node_id") == prev_id:
            parent_comp["config"]["child_node_id"] = node_id
            parent_comp["updated_at"] = now_iso()
            write_json(component_path(parent_comp["type"], parent_comp["comp_id"]), parent_comp)

        if next_id:
            next_node = read_json(node_path(next_id))
            if next_node:
                next_node["previous_node_id"] = prev_id
                next_node["updated_at"] = now_iso()
                write_json(node_path(next_id), next_node)

        write_json(node_path(prev_id), prev_node)
        write_json(node_path(node_id), node)

    if direction == "down" and next_id:
        next_node = read_json(node_path(next_id))
        if not next_node:
            return jsonify({"error": "Next node not found"}), 404
        after_next = next_node.get("next_node_id")

        node["next_node_id"] = after_next
        node["previous_node_id"] = next_id
        node["updated_at"] = now_iso()

        next_node["next_node_id"] = node_id
        next_node["previous_node_id"] = prev_id
        next_node["updated_at"] = now_iso()

        if prev_id:
            prev_node = read_json(node_path(prev_id))
            if prev_node:
                prev_node["next_node_id"] = next_id
                prev_node["updated_at"] = now_iso()
                write_json(node_path(prev_id), prev_node)
        elif parent_comp and parent_comp.get("config", {}).get("child_node_id") == node_id:
            parent_comp["config"]["child_node_id"] = next_id
            parent_comp["updated_at"] = now_iso()
            write_json(component_path(parent_comp["type"], parent_comp["comp_id"]), parent_comp)

        if after_next:
            after_node = read_json(node_path(after_next))
            if after_node:
                after_node["previous_node_id"] = node_id
                after_node["updated_at"] = now_iso()
                write_json(node_path(after_next), after_node)

        write_json(node_path(next_id), next_node)
        write_json(node_path(node_id), node)

    return jsonify(node), 200


@app.get("/nodes/<int:node_id>/resolved")
def get_resolved_node(node_id: int) -> tuple[Any, int]:
    resolved = resolve_node_tree(node_id)
    if not resolved:
        return jsonify({"error": "Node not found"}), 404
    return jsonify(resolved), 200


@app.get("/references")
def list_references() -> tuple[Any, int]:
    return jsonify(list_json_files(REFERENCE_DIR)), 200


@app.post("/references")
def create_reference() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    ref_id = payload.get("ref_id") or generate_id()
    reference = {
        "ref_id": ref_id,
        "node_id": payload.get("node_id"),
        "comp_id": payload.get("comp_id"),
        "overrides": payload.get("overrides"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    if reference["comp_id"] is None:
        return jsonify({"error": "comp_id is required"}), 400
    write_json(reference_path(ref_id), reference)
    return jsonify(reference), 201


@app.get("/references/<int:ref_id>")
def get_reference(ref_id: int) -> tuple[Any, int]:
    reference = read_json(reference_path(ref_id))
    if not reference:
        return jsonify({"error": "Reference not found"}), 404
    return jsonify(reference), 200


@app.put("/references/<int:ref_id>")
def update_reference(ref_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    reference = read_json(reference_path(ref_id))
    if not reference:
        return jsonify({"error": "Reference not found"}), 404
    if "overrides" in payload and isinstance(payload.get("overrides"), dict):
        comp_id = reference.get("comp_id")
        component = find_component(comp_id) if comp_id else None
        if component and component.get("type") == "ViewContainer":
            next_path = payload["overrides"].get("path")
            if next_path:
                if not str(next_path).startswith("/"):
                    return jsonify({"error": "path must start with /"}), 400
                if _is_reserved_view_path(str(next_path)):
                    return jsonify({"error": "path is reserved"}), 400
                for view in _list_views():
                    if view.get("ref_id") == ref_id:
                        continue
                    if view.get("config", {}).get("path") == next_path:
                        return jsonify({"error": "path already exists"}), 409
        incoming_overrides = payload.get("overrides") or {}
        merged_overrides = {**(reference.get("overrides") or {}), **incoming_overrides}
        payload["overrides"] = merged_overrides

    reference.update(payload)
    reference["updated_at"] = now_iso()
    write_json(reference_path(ref_id), reference)
    return jsonify(reference), 200


@app.delete("/references/<int:ref_id>")
def delete_reference(ref_id: int) -> tuple[Any, int]:
    reference = read_json(reference_path(ref_id))
    if not reference:
        return jsonify({"error": "Reference not found"}), 404
    reference_path(ref_id).unlink(missing_ok=True)
    return jsonify({"deleted": ref_id}), 200


@app.get("/components")
def list_all_components() -> tuple[Any, int]:
    return jsonify(list_components()), 200


@app.get("/components/<component_type>")
def list_components_by_type(component_type: str) -> tuple[Any, int]:
    return jsonify(list_json_files(COMPONENT_DIR / component_type)), 200


@app.get("/views")
def list_views() -> tuple[Any, int]:
    return jsonify(_list_views()), 200


@app.post("/views")
def create_view() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    path_value = payload.get("path")
    title = payload.get("title") or "Untitled"
    name = payload.get("name") or title
    description = payload.get("description")

    if not path_value:
        return jsonify({"error": "path is required"}), 400

    if not str(path_value).startswith("/"):
        return jsonify({"error": "path must start with /"}), 400

    if _is_reserved_view_path(str(path_value)):
        return jsonify({"error": "path is reserved"}), 400

    existing = _list_views()
    if any(view.get("config", {}).get("path") == path_value for view in existing):
        return jsonify({"error": "path already exists"}), 409

    comp_id = generate_id()
    component = {
        "comp_id": comp_id,
        "type": "ViewContainer",
        "config": {
            "path": path_value,
            "name": name,
            "title": title,
            "browser_title": title,
            "description": description,
            "child_node_id": None,
            "order": payload.get("order", 0),
        },
        "reference_count": 1,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(component_path("ViewContainer", comp_id), component)

    ref_id = generate_id()
    reference = {
        "ref_id": ref_id,
        "node_id": None,
        "comp_id": comp_id,
        "overrides": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(reference_path(ref_id), reference)

    node_id = generate_id()
    node = {
        "node_id": node_id,
        "ref_id": ref_id,
        "parent_node_id": None,
        "previous_node_id": None,
        "next_node_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(node_path(node_id), node)

    reference["node_id"] = node_id
    write_json(reference_path(ref_id), reference)

    home = read_home_settings()
    if home.get("root_view_node_id") is None:
        home["root_view_node_id"] = node_id
        write_home_settings(home)

    return jsonify({"comp_id": comp_id, "ref_id": ref_id, "node_id": node_id, "config": component["config"]}), 201


@app.post("/views/<int:node_id>/duplicate")
def duplicate_view(node_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    path_value = payload.get("path")
    title = payload.get("title")
    description = payload.get("description")

    if not path_value:
        return jsonify({"error": "path is required"}), 400
    if not str(path_value).startswith("/"):
        return jsonify({"error": "path must start with /"}), 400
    if _is_reserved_view_path(str(path_value)):
        return jsonify({"error": "path is reserved"}), 400

    existing = _list_views()
    if any(view.get("config", {}).get("path") == path_value for view in existing):
        return jsonify({"error": "path already exists"}), 409

    new_node_id = _clone_node_tree(node_id, None)
    if not new_node_id:
        return jsonify({"error": "Failed to clone view"}), 500

    new_node = read_json(node_path(new_node_id))
    new_ref = read_json(reference_path(new_node.get("ref_id"))) if new_node else None
    new_comp = find_component(new_ref.get("comp_id")) if new_ref else None
    if not new_comp:
        return jsonify({"error": "Failed to load cloned view"}), 500

    max_order = 0
    for view in existing:
        order_value = view.get("config", {}).get("order", 0)
        if isinstance(order_value, (int, float)) and order_value > max_order:
            max_order = order_value

    new_title = title or f"Copy of {new_comp.get('config', {}).get('title', 'Untitled')}"
    new_comp["config"]["path"] = path_value
    new_comp["config"]["title"] = new_title
    new_comp["config"]["name"] = payload.get("name") or new_title
    new_comp["config"]["browser_title"] = new_title
    new_comp["config"]["description"] = description
    new_comp["config"]["order"] = max_order + 1
    new_comp["updated_at"] = now_iso()
    write_json(component_path("ViewContainer", new_comp["comp_id"]), new_comp)

    return jsonify({"comp_id": new_comp["comp_id"], "ref_id": new_ref.get("ref_id") if new_ref else None, "node_id": new_node_id, "config": new_comp["config"]}), 201


@app.post("/views/<int:node_id>/mirror")
def mirror_view(node_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    path_value = payload.get("path")
    title = payload.get("title")
    description = payload.get("description")

    if not path_value:
        return jsonify({"error": "path is required"}), 400
    if not str(path_value).startswith("/"):
        return jsonify({"error": "path must start with /"}), 400
    if _is_reserved_view_path(str(path_value)):
        return jsonify({"error": "path is reserved"}), 400

    existing = _list_views()
    if any(view.get("config", {}).get("path") == path_value for view in existing):
        return jsonify({"error": "path already exists"}), 409

    node = read_json(node_path(node_id))
    if not node:
        return jsonify({"error": "Source view not found"}), 404
    reference = read_json(reference_path(node.get("ref_id"))) if node.get("ref_id") else None
    if not reference:
        return jsonify({"error": "Source reference not found"}), 404
    component = find_component(reference.get("comp_id")) if reference.get("comp_id") else None
    if not component or component.get("type") != "ViewContainer":
        return jsonify({"error": "Source component not found"}), 404

    max_order = 0
    for view in existing:
        order_value = view.get("config", {}).get("order", 0)
        if isinstance(order_value, (int, float)) and order_value > max_order:
            max_order = order_value

    ref_id = generate_id()
    overrides = {
        "path": path_value,
        "title": title or component.get("config", {}).get("title", "Untitled"),
        "name": payload.get("name") or title or component.get("config", {}).get("name", "Untitled"),
        "browser_title": title or component.get("config", {}).get("browser_title", "Untitled"),
        "description": description,
        "order": max_order + 1,
    }

    new_reference = {
        "ref_id": ref_id,
        "node_id": None,
        "comp_id": component.get("comp_id"),
        "overrides": overrides,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(reference_path(ref_id), new_reference)

    new_node_id = generate_id()
    new_node = {
        "node_id": new_node_id,
        "ref_id": ref_id,
        "parent_node_id": None,
        "previous_node_id": None,
        "next_node_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(node_path(new_node_id), new_node)

    new_reference["node_id"] = new_node_id
    write_json(reference_path(ref_id), new_reference)

    component["reference_count"] = int(component.get("reference_count", 1)) + 1
    component["updated_at"] = now_iso()
    write_json(component_path(component["type"], component["comp_id"]), component)

    return jsonify({
        "comp_id": component.get("comp_id"),
        "ref_id": ref_id,
        "node_id": new_node_id,
        "config": _merge_config(component, new_reference)
    }), 201


@app.post("/views/<int:node_id>/detach")
def detach_view(node_id: int) -> tuple[Any, int]:
    node = read_json(node_path(node_id))
    if not node:
        return jsonify({"error": "View not found"}), 404
    reference = read_json(reference_path(node.get("ref_id"))) if node.get("ref_id") else None
    if not reference:
        return jsonify({"error": "Reference not found"}), 404
    component = find_component(reference.get("comp_id")) if reference.get("comp_id") else None
    if not component or component.get("type") != "ViewContainer":
        return jsonify({"error": "View component not found"}), 404

    references = list_json_files(REFERENCE_DIR)
    ref_count = len([ref for ref in references if ref.get("comp_id") == component.get("comp_id")])
    if ref_count <= 1:
        return jsonify({"error": "View is already independent"}), 400

    new_comp_id = generate_id()
    new_config = json.loads(json.dumps(component.get("config", {})))
    new_config["child_node_id"] = None
    new_component = {
        "comp_id": new_comp_id,
        "type": component.get("type"),
        "config": new_config,
        "reference_count": 1,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    old_child_id = component.get("config", {}).get("child_node_id")
    if old_child_id:
        new_child_head = _clone_sibling_chain(old_child_id, node_id)
        new_component["config"]["child_node_id"] = new_child_head

    write_json(component_path(new_component["type"], new_comp_id), new_component)

    reference["comp_id"] = new_comp_id
    reference["updated_at"] = now_iso()
    write_json(reference_path(reference["ref_id"]), reference)

    component["reference_count"] = max(0, int(component.get("reference_count", ref_count)) - 1)
    component["updated_at"] = now_iso()
    write_json(component_path(component["type"], component["comp_id"]), component)

    return jsonify({
        "comp_id": new_comp_id,
        "ref_id": reference.get("ref_id"),
        "node_id": node_id,
        "config": _merge_config(new_component, reference)
    }), 200


def _delete_node_tree(node_id: int) -> None:
    node = read_json(node_path(node_id))
    if not node:
        return
    reference = read_json(reference_path(node.get("ref_id"))) if node.get("ref_id") else None
    component = find_component(reference.get("comp_id")) if reference else None

    child_node_id = component.get("config", {}).get("child_node_id") if component else None
    cursor = child_node_id
    while cursor:
        cursor_node = read_json(node_path(cursor))
        next_cursor = cursor_node.get("next_node_id") if cursor_node else None
        _delete_node_tree(cursor)
        cursor = next_cursor

    node_path(node_id).unlink(missing_ok=True)
    if reference:
        reference_path(reference["ref_id"]).unlink(missing_ok=True)
    if component:
        component_path(component["type"], component["comp_id"]).unlink(missing_ok=True)


def _clone_node_tree(source_node_id: int, parent_node_id: int | None) -> int | None:
    source_node = read_json(node_path(source_node_id))
    if not source_node:
        return None
    source_ref = read_json(reference_path(source_node.get("ref_id"))) if source_node.get("ref_id") else None
    if not source_ref:
        return None
    source_comp = find_component(source_ref.get("comp_id")) if source_ref.get("comp_id") else None
    if not source_comp:
        return None

    new_comp_id = generate_id()
    new_config = json.loads(json.dumps(source_comp.get("config", {})))
    if "child_node_id" in new_config:
        new_config["child_node_id"] = None
    new_component = {
        "comp_id": new_comp_id,
        "type": source_comp.get("type"),
        "config": new_config,
        "reference_count": 1,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(component_path(new_component["type"], new_comp_id), new_component)

    new_ref_id = generate_id()
    new_reference = {
        "ref_id": new_ref_id,
        "node_id": None,
        "comp_id": new_comp_id,
        "overrides": json.loads(json.dumps(source_ref.get("overrides"))) if source_ref.get("overrides") else None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(reference_path(new_ref_id), new_reference)

    new_node_id = generate_id()
    new_node = {
        "node_id": new_node_id,
        "ref_id": new_ref_id,
        "parent_node_id": parent_node_id,
        "previous_node_id": None,
        "next_node_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(node_path(new_node_id), new_node)

    new_reference["node_id"] = new_node_id
    write_json(reference_path(new_ref_id), new_reference)

    old_child_id = source_comp.get("config", {}).get("child_node_id")
    if old_child_id:
        new_child_head = _clone_sibling_chain(old_child_id, new_node_id)
        new_component["config"]["child_node_id"] = new_child_head
        new_component["updated_at"] = now_iso()
        write_json(component_path(new_component["type"], new_comp_id), new_component)

    return new_node_id


def _clone_sibling_chain(start_node_id: int, parent_node_id: int) -> int | None:
    cursor = start_node_id
    prev_new_id = None
    new_head = None

    while cursor:
        new_child_id = _clone_node_tree(cursor, parent_node_id)
        if new_child_id is None:
            break
        if new_head is None:
            new_head = new_child_id
        if prev_new_id:
            prev_node = read_json(node_path(prev_new_id))
            if prev_node:
                prev_node["next_node_id"] = new_child_id
                prev_node["updated_at"] = now_iso()
                write_json(node_path(prev_new_id), prev_node)
            current_node = read_json(node_path(new_child_id))
            if current_node:
                current_node["previous_node_id"] = prev_new_id
                current_node["updated_at"] = now_iso()
                write_json(node_path(new_child_id), current_node)

        prev_new_id = new_child_id
        cursor_node = read_json(node_path(cursor))
        cursor = cursor_node.get("next_node_id") if cursor_node else None

    return new_head


@app.delete("/views/<int:node_id>")
def delete_view(node_id: int) -> tuple[Any, int]:
    node = read_json(node_path(node_id))
    if not node:
        return jsonify({"error": "View not found"}), 404
    reference = read_json(reference_path(node.get("ref_id"))) if node.get("ref_id") else None
    if not reference:
        return jsonify({"error": "View reference not found"}), 404
    comp_id = reference.get("comp_id")
    component = find_component(comp_id) if comp_id else None
    if not component or component.get("type") != "ViewContainer":
        return jsonify({"error": "View component not found"}), 404

    references = list_json_files(REFERENCE_DIR)
    ref_count = len([ref for ref in references if ref.get("comp_id") == comp_id])

    if ref_count <= 1:
        _delete_node_tree(node_id)
    else:
        node_path(node_id).unlink(missing_ok=True)
        reference_path(reference.get("ref_id")).unlink(missing_ok=True)
        component["reference_count"] = max(0, int(component.get("reference_count", ref_count)) - 1)
        component["updated_at"] = now_iso()
        write_json(component_path(component["type"], component["comp_id"]), component)

    home = read_home_settings()
    if home.get("root_view_node_id") == node_id:
        home["root_view_node_id"] = None
        write_home_settings(home)

    return jsonify({"deleted": node_id}), 200


@app.post("/components/<component_type>")
def create_component(component_type: str) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    comp_id = payload.get("comp_id") or generate_id()
    component = {
        "comp_id": comp_id,
        "type": component_type,
        "config": payload.get("config", {}),
        "reference_count": payload.get("reference_count", 0),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    write_json(component_path(component_type, comp_id), component)
    return jsonify(component), 201


@app.get("/components/<component_type>/<int:comp_id>")
def get_component(component_type: str, comp_id: int) -> tuple[Any, int]:
    component = read_json(component_path(component_type, comp_id))
    if not component:
        return jsonify({"error": "Component not found"}), 404
    return jsonify(component), 200


@app.put("/components/<component_type>/<int:comp_id>")
def update_component(component_type: str, comp_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    component = read_json(component_path(component_type, comp_id))
    if not component:
        return jsonify({"error": "Component not found"}), 404
    if component_type == "ViewContainer" and isinstance(payload.get("config"), dict):
        next_path = payload["config"].get("path")
        if next_path:
            if not str(next_path).startswith("/"):
                return jsonify({"error": "path must start with /"}), 400
            if _is_reserved_view_path(str(next_path)):
                return jsonify({"error": "path is reserved"}), 400
            existing = _list_views()
            if any(
                view.get("comp_id") != comp_id and view.get("config", {}).get("path") == next_path
                for view in existing
            ):
                return jsonify({"error": "path already exists"}), 409
    component.update(payload)
    component["updated_at"] = now_iso()
    write_json(component_path(component_type, comp_id), component)
    return jsonify(component), 200


@app.delete("/components/<component_type>/<int:comp_id>")
def delete_component(component_type: str, comp_id: int) -> tuple[Any, int]:
    component = read_json(component_path(component_type, comp_id))
    if not component:
        return jsonify({"error": "Component not found"}), 404
    component_path(component_type, comp_id).unlink(missing_ok=True)
    return jsonify({"deleted": comp_id}), 200


@app.get("/components/<component_type>/<int:comp_id>/usages")
def component_usages(component_type: str, comp_id: int) -> tuple[Any, int]:
    references = list_json_files(REFERENCE_DIR)
    usages = [ref for ref in references if ref.get("comp_id") == comp_id]
    return jsonify(usages), 200


@app.get("/home")
def get_home() -> tuple[Any, int]:
    return jsonify(read_home_settings()), 200


@app.put("/home")
def update_home() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    home = read_home_settings()
    home.update(payload)
    write_home_settings(home)
    return jsonify(home), 200


@app.get("/home/root-view")
def get_root_view() -> tuple[Any, int]:
    home = read_home_settings()
    return jsonify({"root_view_node_id": home.get("root_view_node_id")}), 200


@app.put("/home/root-view")
def update_root_view() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    home = read_home_settings()
    home["root_view_node_id"] = payload.get("root_view_node_id")
    write_home_settings(home)
    return jsonify({"root_view_node_id": home.get("root_view_node_id")}), 200


@app.get("/navigation")
def get_navigation() -> tuple[Any, int]:
    menu = list_json_files(MENU_DIR)
    footer = list_json_files(FOOTER_DIR)
    return jsonify({"menu": menu, "footer": footer}), 200


@app.get("/menu")
def list_menu() -> tuple[Any, int]:
    return jsonify(list_json_files(MENU_DIR)), 200


@app.post("/menu")
def create_menu_item() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    menu_id = payload.get("menu_id") or generate_id()
    item = {
        "menu_id": menu_id,
        "label": payload.get("label", "Untitled"),
        "href": payload.get("href", "/"),
        "order": payload.get("order", 0),
        "position": payload.get("position", "right"),
    }
    write_json(MENU_DIR / f"{menu_id}.json", item)
    return jsonify(item), 201


@app.put("/menu/<int:menu_id>")
def update_menu_item(menu_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    item = read_json(MENU_DIR / f"{menu_id}.json")
    if not item:
        return jsonify({"error": "Menu item not found"}), 404
    item.update(payload)
    write_json(MENU_DIR / f"{menu_id}.json", item)
    return jsonify(item), 200


@app.delete("/menu/<int:menu_id>")
def delete_menu_item(menu_id: int) -> tuple[Any, int]:
    (MENU_DIR / f"{menu_id}.json").unlink(missing_ok=True)
    return jsonify({"deleted": menu_id}), 200


@app.get("/footer")
def list_footer() -> tuple[Any, int]:
    return jsonify(list_json_files(FOOTER_DIR)), 200


@app.post("/footer")
def create_footer_item() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    footer_id = payload.get("footer_id") or generate_id()
    item = {
        "footer_id": footer_id,
        "label": payload.get("label", "Untitled"),
        "href": payload.get("href", "/"),
        "order": payload.get("order", 0),
        "position": payload.get("position", "left"),
    }
    write_json(FOOTER_DIR / f"{footer_id}.json", item)
    return jsonify(item), 201


@app.put("/footer/<int:footer_id>")
def update_footer_item(footer_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    item = read_json(FOOTER_DIR / f"{footer_id}.json")
    if not item:
        return jsonify({"error": "Footer item not found"}), 404
    item.update(payload)
    write_json(FOOTER_DIR / f"{footer_id}.json", item)
    return jsonify(item), 200


@app.delete("/footer/<int:footer_id>")
def delete_footer_item(footer_id: int) -> tuple[Any, int]:
    (FOOTER_DIR / f"{footer_id}.json").unlink(missing_ok=True)
    return jsonify({"deleted": footer_id}), 200


@app.get("/themes")
def list_themes() -> tuple[Any, int]:
    themes = list_json_files(THEME_CUSTOM_DIR)
    return jsonify(themes), 200


@app.put("/themes")
def update_theme_config() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    config = read_theme_config()
    config.update(payload)
    write_theme_config(config)
    return jsonify(config), 200


@app.get("/themes/<int:theme_id>")
def get_theme(theme_id: int) -> tuple[Any, int]:
    theme = read_json(THEME_CUSTOM_DIR / f"{theme_id}.json")
    if not theme:
        return jsonify({"error": "Theme not found"}), 404
    return jsonify(theme), 200


@app.put("/themes/<int:theme_id>")
def update_theme(theme_id: int) -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    theme = read_json(THEME_CUSTOM_DIR / f"{theme_id}.json") or {"theme_id": theme_id}
    theme.update(payload)
    write_json(THEME_CUSTOM_DIR / f"{theme_id}.json", theme)
    return jsonify(theme), 200


@app.delete("/themes/<int:theme_id>")
def delete_theme(theme_id: int) -> tuple[Any, int]:
    (THEME_CUSTOM_DIR / f"{theme_id}.json").unlink(missing_ok=True)
    return jsonify({"deleted": theme_id}), 200


@app.get("/metadata")
def get_metadata() -> tuple[Any, int]:
    metadata = read_json(Path("content/metadata.json"), {})
    return jsonify(metadata), 200


@app.put("/metadata")
def update_metadata() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    write_json(Path("content/metadata.json"), payload)
    return jsonify(payload), 200


@app.post("/export")
def export_snapshot() -> tuple[Any, int]:
    metadata = export_metadata()
    return jsonify(metadata), 200


@app.post("/fetch-image")
def fetch_image() -> tuple[Any, int]:
    payload = request.get_json(force=True) or {}
    url = payload.get("url")
    if not url:
        return jsonify({"error": "url is required"}), 400

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except Exception as exc:
        return jsonify({"error": f"Failed to fetch: {exc}"}), 400

    parsed = urlparse(url)
    filename = os.path.basename(parsed.path)
    if not filename:
        content_type = response.headers.get("content-type", "")
        ext = mimetypes.guess_extension(content_type.split(";")[0].strip())
        filename = f"image{ext or '.bin'}"

    data = response.content
    ok, error = _validate_upload(filename, data, ["image/"])
    if not ok:
        return jsonify({"error": error}), 400
    src = _save_image_bytes(data, filename)
    return jsonify({"src": src}), 200


@app.post("/save-image")
def save_image() -> tuple[Any, int]:
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "filename is required"}), 400

    data = file.read()
    ok, error = _validate_upload(file.filename, data, ["image/"])
    if not ok:
        return jsonify({"error": error}), 400
    src = _save_image_bytes(data, file.filename)
    return jsonify({"src": src}), 200


@app.post("/upload-asset")
def upload_asset() -> tuple[Any, int]:
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "filename is required"}), 400

    data = file.read()
    ok, error = _validate_upload(file.filename, data, ["image/", "video/", "application/pdf"])
    if not ok:
        return jsonify({"error": error}), 400
    src = _save_image_bytes(data, file.filename)
    return jsonify({"src": src}), 200


@app.get("/assets")
def list_assets() -> tuple[Any, int]:
    return jsonify(_list_uploads()), 200


@app.get("/assets/usage")
def list_asset_usage() -> tuple[Any, int]:
    nodes_list = list_json_files(NODE_DIR)
    references = list_json_files(REFERENCE_DIR)
    components = list_components()

    node_map = {node.get("node_id"): node for node in nodes_list}
    comp_map: dict[int, dict[str, Any]] = {}
    for comp_type, items in components.items():
        for comp in items:
            comp_map[comp.get("comp_id")] = comp

    view_paths: dict[int, str] = {}
    for ref in references:
        comp = comp_map.get(ref.get("comp_id"))
        if not comp or comp.get("type") != "ViewContainer":
            continue
        config = _merge_config(comp, ref)
        if ref.get("node_id"):
            view_paths[ref.get("node_id")] = str(config.get("path") or "/")

    usage_map: dict[str, dict[str, Any]] = {}
    for ref in references:
        comp = comp_map.get(ref.get("comp_id"))
        if not comp:
            continue
        comp_type = comp.get("type")
        config = _merge_config(comp, ref)
        src = None
        if comp_type in {"ImageMedia", "VideoMedia", "PDFMedia"}:
            src = config.get("src")
        if comp_type == "ExperienceComponent":
            src = config.get("image")
        if not src:
            continue
        view_path = _resolve_view_path(ref.get("node_id"), node_map, view_paths)
        entry = usage_map.setdefault(str(src), {"count": 0, "views": []})
        entry["count"] += 1
        if view_path and view_path not in entry["views"]:
            entry["views"].append(view_path)

    return jsonify(usage_map), 200


@app.delete("/assets/<path:filename>")
def delete_asset(filename: str) -> tuple[Any, int]:
    uploads_dir = Path("public") / "uploads"
    file_path = uploads_dir / filename
    if not file_path.exists():
        return jsonify({"error": "Asset not found"}), 404
    file_path.unlink(missing_ok=True)
    return jsonify({"deleted": filename}), 200


@app.post("/upload-pdf")
def upload_pdf() -> tuple[Any, int]:
    return jsonify({"error": "Not implemented"}), 501


@app.get("/raw/<entity_type>")
def raw_entities(entity_type: str) -> tuple[Any, int]:
    if entity_type == "nodes":
        return jsonify(list_json_files(NODE_DIR)), 200
    if entity_type == "references":
        return jsonify(list_json_files(REFERENCE_DIR)), 200
    if entity_type == "components":
        return jsonify(list_components()), 200
    if entity_type == "menu":
        return jsonify(list_json_files(MENU_DIR)), 200
    if entity_type == "footer":
        return jsonify(list_json_files(FOOTER_DIR)), 200
    if entity_type == "themes":
        return jsonify(list_json_files(THEME_CUSTOM_DIR)), 200
    return jsonify({"error": "Unknown entity type"}), 400


if __name__ == "__main__":
    port = int(os.environ.get("AUTHOR_PORT", "4001"))
    app.run(port=port, debug=True)
