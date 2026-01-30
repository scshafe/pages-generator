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
    ensure_dirs,
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-only", action="store_true")
    parser.add_argument("--settings-only", action="store_true")
    parser.add_argument("--interactive", action="store_true")
    args = parser.parse_args()

    ensure_dirs()

    if args.interactive:
        print("Reset data? (y/n)")
        reset_data = input().strip().lower() == "y"
        print("Reset settings? (y/n)")
        reset_settings_flag = input().strip().lower() == "y"
    else:
        reset_data = not args.settings_only
        reset_settings_flag = not args.data_only

    if reset_data:
        clear_directory(NODE_DIR)
        clear_directory(REFERENCE_DIR)
        clear_components()
        reset_uploads()

    if reset_settings_flag:
        reset_settings()

    print("Reset complete")


if __name__ == "__main__":
    main()
