from __future__ import annotations

from pathlib import Path
from typing import Any

from .database import (
    COMPONENT_DIR,
    FOOTER_DIR,
    HOME_FILE,
    MENU_DIR,
    NODE_DIR,
    REFERENCE_DIR,
    THEME_CONFIG,
    THEME_CUSTOM_DIR,
    list_components,
    list_json_files,
    read_json,
    write_json,
)


def export_metadata() -> dict[str, Any]:
    nodes = list_json_files(NODE_DIR)
    references = list_json_files(REFERENCE_DIR)
    components = list_components()
    home = read_json(HOME_FILE, {"label": "Home", "root_view_node_id": None})
    menu = list_json_files(MENU_DIR)
    footer = list_json_files(FOOTER_DIR)
    themes = list_json_files(THEME_CUSTOM_DIR)
    theme_config = read_json(THEME_CONFIG, {"active_theme_id": None, "color_scheme": "system"})
    uploads_dir = Path("public") / "uploads"
    assets = []
    if uploads_dir.exists():
        for file_path in uploads_dir.iterdir():
            if not file_path.is_file():
                continue
            assets.append(
                {
                    "name": file_path.name,
                    "src": f"/uploads/{file_path.name}",
                    "size": file_path.stat().st_size,
                }
            )

    metadata = {
        "nodes": nodes,
        "references": references,
        "components": components,
        "settings": {
            "home": home,
            "menu": menu,
            "footer": footer,
            "themes": themes,
            "themeConfig": theme_config,
        },
        "assets": assets,
    }

    write_json(Path("content/metadata.json"), metadata)
    return metadata


if __name__ == "__main__":
    export_metadata()
