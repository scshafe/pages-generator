"""SQLite storage adapter."""

from __future__ import annotations

import json
import random
import sqlite3
from pathlib import Path
from typing import Any

from .base import StorageAdapter


class SQLiteStorageAdapter(StorageAdapter):
    """Storage adapter that uses SQLite database."""

    def __init__(self, db_path: Path | str):
        self.db_path = Path(db_path)
        self._connection: sqlite3.Connection | None = None

    @property
    def connection(self) -> sqlite3.Connection:
        """Get or create database connection."""
        if self._connection is None:
            self._connection = sqlite3.connect(str(self.db_path), check_same_thread=False)
            self._connection.row_factory = sqlite3.Row
        return self._connection

    def initialize(self) -> None:
        """Create database tables."""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        cursor = self.connection.cursor()

        # Nodes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nodes (
                node_id INTEGER PRIMARY KEY,
                data TEXT NOT NULL
            )
        """)

        # References table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS refs (
                ref_id INTEGER PRIMARY KEY,
                data TEXT NOT NULL
            )
        """)

        # Components table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS components (
                comp_id INTEGER PRIMARY KEY,
                type TEXT NOT NULL,
                data TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_components_type ON components(type)
        """)

        # Settings table (key-value store for various settings)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                data TEXT NOT NULL
            )
        """)

        # Menus table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS menus (
                menu_id INTEGER PRIMARY KEY,
                data TEXT NOT NULL
            )
        """)

        # Footers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS footers (
                footer_id INTEGER PRIMARY KEY,
                data TEXT NOT NULL
            )
        """)

        # Custom themes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_themes (
                theme_id INTEGER PRIMARY KEY,
                data TEXT NOT NULL
            )
        """)

        self.connection.commit()

    def generate_id(self) -> int:
        """Generate a random ID."""
        return random.randint(0, 0xFFFFFFFF)

    def close(self) -> None:
        """Close the database connection."""
        if self._connection:
            self._connection.close()
            self._connection = None

    # Node operations
    def get_node(self, node_id: int) -> dict[str, Any] | None:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM nodes WHERE node_id = ?", (node_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return None

    def save_node(self, node: dict[str, Any]) -> None:
        node_id = node.get("node_id")
        if not node_id:
            raise ValueError("Node must have node_id")
        cursor = self.connection.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO nodes (node_id, data) VALUES (?, ?)",
            (node_id, json.dumps(node, sort_keys=True))
        )
        self.connection.commit()

    def delete_node(self, node_id: int) -> bool:
        cursor = self.connection.cursor()
        cursor.execute("DELETE FROM nodes WHERE node_id = ?", (node_id,))
        self.connection.commit()
        return cursor.rowcount > 0

    def list_nodes(self) -> list[dict[str, Any]]:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM nodes")
        return [json.loads(row["data"]) for row in cursor.fetchall()]

    # Reference operations
    def get_reference(self, ref_id: int) -> dict[str, Any] | None:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM refs WHERE ref_id = ?", (ref_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return None

    def save_reference(self, reference: dict[str, Any]) -> None:
        ref_id = reference.get("ref_id")
        if not ref_id:
            raise ValueError("Reference must have ref_id")
        cursor = self.connection.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO refs (ref_id, data) VALUES (?, ?)",
            (ref_id, json.dumps(reference, sort_keys=True))
        )
        self.connection.commit()

    def delete_reference(self, ref_id: int) -> bool:
        cursor = self.connection.cursor()
        cursor.execute("DELETE FROM refs WHERE ref_id = ?", (ref_id,))
        self.connection.commit()
        return cursor.rowcount > 0

    def list_references(self) -> list[dict[str, Any]]:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM refs")
        return [json.loads(row["data"]) for row in cursor.fetchall()]

    # Component operations
    def get_component(self, comp_id: int) -> dict[str, Any] | None:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM components WHERE comp_id = ?", (comp_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return None

    def get_component_by_type(self, component_type: str, comp_id: int) -> dict[str, Any] | None:
        cursor = self.connection.cursor()
        cursor.execute(
            "SELECT data FROM components WHERE comp_id = ? AND type = ?",
            (comp_id, component_type)
        )
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return None

    def save_component(self, component: dict[str, Any]) -> None:
        comp_type = component.get("type")
        comp_id = component.get("comp_id")
        if not comp_type or not comp_id:
            raise ValueError("Component must have type and comp_id")
        cursor = self.connection.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO components (comp_id, type, data) VALUES (?, ?, ?)",
            (comp_id, comp_type, json.dumps(component, sort_keys=True))
        )
        self.connection.commit()

    def delete_component(self, component_type: str, comp_id: int) -> bool:
        cursor = self.connection.cursor()
        cursor.execute(
            "DELETE FROM components WHERE comp_id = ? AND type = ?",
            (comp_id, component_type)
        )
        self.connection.commit()
        return cursor.rowcount > 0

    def list_components(self) -> dict[str, list[dict[str, Any]]]:
        cursor = self.connection.cursor()
        cursor.execute("SELECT type, data FROM components ORDER BY type")
        components: dict[str, list[dict[str, Any]]] = {}
        for row in cursor.fetchall():
            comp_type = row["type"]
            if comp_type not in components:
                components[comp_type] = []
            components[comp_type].append(json.loads(row["data"]))
        return components

    # Settings operations
    def _get_setting(self, key: str, default: dict[str, Any]) -> dict[str, Any]:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return default

    def _save_setting(self, key: str, data: dict[str, Any]) -> None:
        cursor = self.connection.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO settings (key, data) VALUES (?, ?)",
            (key, json.dumps(data, sort_keys=True))
        )
        self.connection.commit()

    def get_home_settings(self) -> dict[str, Any]:
        return self._get_setting("home", {"label": "Home", "root_view_node_id": None})

    def save_home_settings(self, settings: dict[str, Any]) -> None:
        self._save_setting("home", settings)

    def get_site_settings(self) -> dict[str, Any]:
        return self._get_setting(
            "site",
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
        self._save_setting("site", settings)

    def get_theme_config(self) -> dict[str, Any]:
        return self._get_setting("theme_config", {"active_theme_id": None, "color_scheme": "system"})

    def save_theme_config(self, config: dict[str, Any]) -> None:
        self._save_setting("theme_config", config)

    # Menu operations
    def get_menu(self, menu_id: int) -> dict[str, Any] | None:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM menus WHERE menu_id = ?", (menu_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return None

    def save_menu(self, menu: dict[str, Any]) -> None:
        menu_id = menu.get("menu_id")
        if not menu_id:
            raise ValueError("Menu must have menu_id")
        cursor = self.connection.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO menus (menu_id, data) VALUES (?, ?)",
            (menu_id, json.dumps(menu, sort_keys=True))
        )
        self.connection.commit()

    def delete_menu(self, menu_id: int) -> bool:
        cursor = self.connection.cursor()
        cursor.execute("DELETE FROM menus WHERE menu_id = ?", (menu_id,))
        self.connection.commit()
        return cursor.rowcount > 0

    def list_menus(self) -> list[dict[str, Any]]:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM menus")
        return [json.loads(row["data"]) for row in cursor.fetchall()]

    # Footer operations
    def get_footer(self, footer_id: int) -> dict[str, Any] | None:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM footers WHERE footer_id = ?", (footer_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return None

    def save_footer(self, footer: dict[str, Any]) -> None:
        footer_id = footer.get("footer_id")
        if not footer_id:
            raise ValueError("Footer must have footer_id")
        cursor = self.connection.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO footers (footer_id, data) VALUES (?, ?)",
            (footer_id, json.dumps(footer, sort_keys=True))
        )
        self.connection.commit()

    def delete_footer(self, footer_id: int) -> bool:
        cursor = self.connection.cursor()
        cursor.execute("DELETE FROM footers WHERE footer_id = ?", (footer_id,))
        self.connection.commit()
        return cursor.rowcount > 0

    def list_footers(self) -> list[dict[str, Any]]:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM footers")
        return [json.loads(row["data"]) for row in cursor.fetchall()]

    # Custom theme operations
    def get_custom_theme(self, theme_id: int) -> dict[str, Any] | None:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM custom_themes WHERE theme_id = ?", (theme_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return None

    def save_custom_theme(self, theme: dict[str, Any]) -> None:
        theme_id = theme.get("theme_id")
        if not theme_id:
            raise ValueError("Theme must have theme_id")
        cursor = self.connection.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO custom_themes (theme_id, data) VALUES (?, ?)",
            (theme_id, json.dumps(theme, sort_keys=True))
        )
        self.connection.commit()

    def delete_custom_theme(self, theme_id: int) -> bool:
        cursor = self.connection.cursor()
        cursor.execute("DELETE FROM custom_themes WHERE theme_id = ?", (theme_id,))
        self.connection.commit()
        return cursor.rowcount > 0

    def list_custom_themes(self) -> list[dict[str, Any]]:
        cursor = self.connection.cursor()
        cursor.execute("SELECT data FROM custom_themes")
        return [json.loads(row["data"]) for row in cursor.fetchall()]
