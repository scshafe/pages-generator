from __future__ import annotations

import argparse
from pathlib import Path

from .database import (
    COMPONENT_DIR,
    FOOTER_DIR,
    HOME_FILE,
    MENU_DIR,
    NODE_DIR,
    REFERENCE_DIR,
    SITE_FILE,
    THEME_CONFIG,
    THEME_CUSTOM_DIR,
    component_path,
    ensure_dirs,
    generate_id,
    node_path,
    now_iso,
    reference_path,
    write_json,
)


def clear_directory(directory: Path) -> None:
    if not directory.exists():
        return
    for file in directory.glob("*.json"):
        file.unlink(missing_ok=True)


def clear_components() -> None:
    if not COMPONENT_DIR.exists():
        return
    for comp_dir in COMPONENT_DIR.iterdir():
        if not comp_dir.is_dir():
            continue
        clear_directory(comp_dir)


def reset_settings() -> None:
    write_json(HOME_FILE, {"label": "Home", "root_view_node_id": None})
    write_json(
        SITE_FILE,
        {
            "site_name": "",
            "tagline": "",
            "site_url": "",
            "description": "",
            "keywords": "",
            "author": "",
            "language": "en",
            "theme_color": "#1f3b56",
            "twitter_handle": "",
            "social_image_url": "",
            "social_image_border_enabled": False,
            "social_image_border_color": "#0f172a",
            "social_image_border_width": 16,
            "social_image_border_radius": 24,
            "robots": "index,follow",
            "favicon_src": "",
        },
    )
    write_json(THEME_CONFIG, {"active_theme_id": None, "color_scheme": "system"})
    clear_directory(MENU_DIR)
    clear_directory(FOOTER_DIR)
    clear_directory(THEME_CUSTOM_DIR)


def reset_uploads() -> None:
    uploads_dir = Path("public") / "uploads"
    if not uploads_dir.exists():
        return
    for file in uploads_dir.iterdir():
        if file.is_file():
            file.unlink(missing_ok=True)


def hard_reset() -> None:
    ensure_dirs()
    clear_directory(NODE_DIR)
    clear_directory(REFERENCE_DIR)
    clear_components()
    reset_uploads()
    reset_settings()


def seed_minimal() -> None:
    created_at = now_iso()
    comp_id = generate_id()
    component = {
        "comp_id": comp_id,
        "type": "Container",
        "config": {
            "path": "/home",
            "name": "Home",
            "title": "Home",
            "browser_title": "Home",
            "description": "",
            "child_node_id": None,
            "order": 0,
        },
        "reference_count": 1,
        "created_at": created_at,
        "updated_at": created_at,
    }
    write_json(component_path("Container", comp_id), component)

    ref_id = generate_id()
    reference = {
        "ref_id": ref_id,
        "node_id": None,
        "comp_id": comp_id,
        "overrides": None,
        "created_at": created_at,
        "updated_at": created_at,
    }
    write_json(reference_path(ref_id), reference)

    node_id = generate_id()
    node = {
        "node_id": node_id,
        "ref_id": ref_id,
        "parent_node_id": None,
        "previous_node_id": None,
        "next_node_id": None,
        "created_at": created_at,
        "updated_at": created_at,
    }
    write_json(node_path(node_id), node)

    reference["node_id"] = node_id
    write_json(reference_path(ref_id), reference)


    write_json(HOME_FILE, {"label": "Home", "root_view_node_id": node_id})

    menu_id = generate_id()
    menu_item = {
        "menu_id": menu_id,
        "label": "Home",
        "href": "/home",
        "order": 0,
        "position": "left",
        "view_node_id": node_id,
    }
    write_json(MENU_DIR / f"{menu_id}.json", menu_item)


def seed_example() -> None:
    seed_minimal()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["hard", "minimal", "example"])
    args = parser.parse_args()

    if args.command == "hard":
        hard_reset()
        print("Hard reset complete")
        return
    if args.command == "minimal":
        hard_reset()
        seed_minimal()
        print("Minimal reset complete")
        return
    if args.command == "example":
        hard_reset()
        seed_example()
        print("Example reset complete")


if __name__ == "__main__":
    main()
