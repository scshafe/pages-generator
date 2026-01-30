from __future__ import annotations

import json
import random
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

CONTENT_ROOT = Path(__file__).resolve().parents[1] / "content"

NODE_DIR = CONTENT_ROOT / "nodes"
REFERENCE_DIR = CONTENT_ROOT / "references"
COMPONENT_DIR = CONTENT_ROOT / "components"
SETTINGS_DIR = CONTENT_ROOT / "settings"

THEME_DIR = SETTINGS_DIR / "themes"
THEME_CONFIG = THEME_DIR / "config.json"
THEME_CUSTOM_DIR = THEME_DIR / "custom"
HOME_FILE = SETTINGS_DIR / "home.json"

MENU_DIR = SETTINGS_DIR / "menu"
FOOTER_DIR = SETTINGS_DIR / "footer"
SITE_FILE = SETTINGS_DIR / "site.json"


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def generate_id() -> int:
    return random.randint(0, 0xFFFFFFFF)


def ensure_dirs() -> None:
    for directory in [
        NODE_DIR,
        REFERENCE_DIR,
        COMPONENT_DIR,
        SETTINGS_DIR,
        MENU_DIR,
        FOOTER_DIR,
        THEME_DIR,
        THEME_CUSTOM_DIR,
    ]:
        directory.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, default: Any | None = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text())


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True))


def list_json_files(directory: Path) -> list[Any]:
    if not directory.exists():
        return []
    items = []
    for file in directory.glob("*.json"):
        items.append(read_json(file))
    return items


def node_path(node_id: int) -> Path:
    return NODE_DIR / f"{node_id}.json"


def reference_path(ref_id: int) -> Path:
    return REFERENCE_DIR / f"{ref_id}.json"


def component_path(component_type: str, comp_id: int) -> Path:
    return COMPONENT_DIR / component_type / f"{comp_id}.json"


def list_components() -> dict[str, list[Any]]:
    components: dict[str, list[Any]] = {}
    if not COMPONENT_DIR.exists():
        return components
    for comp_dir in COMPONENT_DIR.iterdir():
        if not comp_dir.is_dir():
            continue
        components[comp_dir.name] = list_json_files(comp_dir)
    return components


def find_component(comp_id: int) -> dict[str, Any] | None:
    if not COMPONENT_DIR.exists():
        return None
    for comp_dir in COMPONENT_DIR.iterdir():
        if not comp_dir.is_dir():
            continue
        file_path = comp_dir / f"{comp_id}.json"
        if file_path.exists():
            return read_json(file_path)
    return None


def read_home_settings() -> dict[str, Any]:
    return read_json(HOME_FILE, {"label": "Home", "root_view_node_id": None})


def write_home_settings(data: dict[str, Any]) -> None:
    write_json(HOME_FILE, data)


def read_site_settings() -> dict[str, Any]:
    return read_json(
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


def write_site_settings(data: dict[str, Any]) -> None:
    write_json(SITE_FILE, data)


def read_theme_config() -> dict[str, Any]:
    return read_json(THEME_CONFIG, {"active_theme_id": None, "color_scheme": "system"})


def write_theme_config(data: dict[str, Any]) -> None:
    write_json(THEME_CONFIG, data)
