"""JSON file storage adapter."""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any

from .base import StorageAdapter


class JSONStorageAdapter(StorageAdapter):
    """Storage adapter that uses JSON files."""

    def __init__(self, content_root: Path | str):
        self.content_root = Path(content_root)
        self.node_dir = self.content_root / "nodes"
        self.reference_dir = self.content_root / "references"
        self.component_dir = self.content_root / "components"
        self.settings_dir = self.content_root / "settings"
        self.theme_dir = self.settings_dir / "themes"
        self.theme_config_file = self.theme_dir / "config.json"
        self.theme_custom_dir = self.theme_dir / "custom"
        self.home_file = self.settings_dir / "home.json"
        self.menu_dir = self.settings_dir / "menu"
        self.footer_dir = self.settings_dir / "footer"
        self.site_file = self.settings_dir / "site.json"

    def initialize(self) -> None:
        """Create required directories."""
        for directory in [
            self.node_dir,
            self.reference_dir,
            self.component_dir,
            self.settings_dir,
            self.menu_dir,
            self.footer_dir,
            self.theme_dir,
            self.theme_custom_dir,
        ]:
            directory.mkdir(parents=True, exist_ok=True)

    def generate_id(self) -> int:
        """Generate a random ID."""
        return random.randint(0, 0xFFFFFFFF)

    def _read_json(self, path: Path, default: Any | None = None) -> Any:
        """Read JSON from file."""
        if not path.exists():
            return default
        return json.loads(path.read_text())

    def _write_json(self, path: Path, data: Any) -> None:
        """Write JSON to file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2, sort_keys=True))

    def _list_json_files(self, directory: Path) -> list[Any]:
        """List all JSON files in a directory."""
        if not directory.exists():
            return []
        items = []
        for file in directory.glob("*.json"):
            items.append(self._read_json(file))
        return items

    # Node operations
    def get_node(self, node_id: int) -> dict[str, Any] | None:
        path = self.node_dir / f"{node_id}.json"
        return self._read_json(path)

    def save_node(self, node: dict[str, Any]) -> None:
        node_id = node.get("node_id")
        if not node_id:
            raise ValueError("Node must have node_id")
        path = self.node_dir / f"{node_id}.json"
        self._write_json(path, node)

    def delete_node(self, node_id: int) -> bool:
        path = self.node_dir / f"{node_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def list_nodes(self) -> list[dict[str, Any]]:
        return self._list_json_files(self.node_dir)

    # Reference operations
    def get_reference(self, ref_id: int) -> dict[str, Any] | None:
        path = self.reference_dir / f"{ref_id}.json"
        return self._read_json(path)

    def save_reference(self, reference: dict[str, Any]) -> None:
        ref_id = reference.get("ref_id")
        if not ref_id:
            raise ValueError("Reference must have ref_id")
        path = self.reference_dir / f"{ref_id}.json"
        self._write_json(path, reference)

    def delete_reference(self, ref_id: int) -> bool:
        path = self.reference_dir / f"{ref_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def list_references(self) -> list[dict[str, Any]]:
        return self._list_json_files(self.reference_dir)

    # Component operations
    def get_component(self, comp_id: int) -> dict[str, Any] | None:
        """Search all component types for a component."""
        if not self.component_dir.exists():
            return None
        for comp_dir in self.component_dir.iterdir():
            if not comp_dir.is_dir():
                continue
            file_path = comp_dir / f"{comp_id}.json"
            if file_path.exists():
                return self._read_json(file_path)
        return None

    def get_component_by_type(self, component_type: str, comp_id: int) -> dict[str, Any] | None:
        path = self.component_dir / component_type / f"{comp_id}.json"
        return self._read_json(path)

    def save_component(self, component: dict[str, Any]) -> None:
        comp_type = component.get("type")
        comp_id = component.get("comp_id")
        if not comp_type or not comp_id:
            raise ValueError("Component must have type and comp_id")
        path = self.component_dir / comp_type / f"{comp_id}.json"
        self._write_json(path, component)

    def delete_component(self, component_type: str, comp_id: int) -> bool:
        path = self.component_dir / component_type / f"{comp_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def list_components(self) -> dict[str, list[dict[str, Any]]]:
        components: dict[str, list[Any]] = {}
        if not self.component_dir.exists():
            return components
        for comp_dir in self.component_dir.iterdir():
            if not comp_dir.is_dir():
                continue
            components[comp_dir.name] = self._list_json_files(comp_dir)
        return components

    # Settings operations
    def get_home_settings(self) -> dict[str, Any]:
        return self._read_json(self.home_file, {"label": "Home", "root_view_node_id": None})

    def save_home_settings(self, settings: dict[str, Any]) -> None:
        self._write_json(self.home_file, settings)

    def get_site_settings(self) -> dict[str, Any]:
        return self._read_json(
            self.site_file,
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

    def save_site_settings(self, settings: dict[str, Any]) -> None:
        self._write_json(self.site_file, settings)

    def get_theme_config(self) -> dict[str, Any]:
        return self._read_json(self.theme_config_file, {"active_theme_id": None, "color_scheme": "system"})

    def save_theme_config(self, config: dict[str, Any]) -> None:
        self._write_json(self.theme_config_file, config)

    # Menu operations
    def get_menu(self, menu_id: int) -> dict[str, Any] | None:
        path = self.menu_dir / f"{menu_id}.json"
        return self._read_json(path)

    def save_menu(self, menu: dict[str, Any]) -> None:
        menu_id = menu.get("menu_id")
        if not menu_id:
            raise ValueError("Menu must have menu_id")
        path = self.menu_dir / f"{menu_id}.json"
        self._write_json(path, menu)

    def delete_menu(self, menu_id: int) -> bool:
        path = self.menu_dir / f"{menu_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def list_menus(self) -> list[dict[str, Any]]:
        return self._list_json_files(self.menu_dir)

    # Footer operations
    def get_footer(self, footer_id: int) -> dict[str, Any] | None:
        path = self.footer_dir / f"{footer_id}.json"
        return self._read_json(path)

    def save_footer(self, footer: dict[str, Any]) -> None:
        footer_id = footer.get("footer_id")
        if not footer_id:
            raise ValueError("Footer must have footer_id")
        path = self.footer_dir / f"{footer_id}.json"
        self._write_json(path, footer)

    def delete_footer(self, footer_id: int) -> bool:
        path = self.footer_dir / f"{footer_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def list_footers(self) -> list[dict[str, Any]]:
        return self._list_json_files(self.footer_dir)

    # Custom theme operations
    def get_custom_theme(self, theme_id: int) -> dict[str, Any] | None:
        path = self.theme_custom_dir / f"{theme_id}.json"
        return self._read_json(path)

    def save_custom_theme(self, theme: dict[str, Any]) -> None:
        theme_id = theme.get("theme_id")
        if not theme_id:
            raise ValueError("Theme must have theme_id")
        path = self.theme_custom_dir / f"{theme_id}.json"
        self._write_json(path, theme)

    def delete_custom_theme(self, theme_id: int) -> bool:
        path = self.theme_custom_dir / f"{theme_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def list_custom_themes(self) -> list[dict[str, Any]]:
        return self._list_json_files(self.theme_custom_dir)
