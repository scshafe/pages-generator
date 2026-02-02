"""PostgreSQL storage adapter."""

from __future__ import annotations

import json
import random
from typing import Any

try:
    import psycopg2
    import psycopg2.extras
    from psycopg2.pool import ThreadedConnectionPool
except ImportError:
    psycopg2 = None  # type: ignore
    ThreadedConnectionPool = None  # type: ignore

from .base import StorageAdapter


class PostgresStorageAdapter(StorageAdapter):
    """Storage adapter that uses PostgreSQL database."""

    def __init__(self, database_url: str, min_connections: int = 1, max_connections: int = 10):
        if psycopg2 is None:
            raise ImportError("psycopg2 is required for PostgreSQL storage. Install with: pip install psycopg2-binary")

        self.database_url = database_url
        self.min_connections = min_connections
        self.max_connections = max_connections
        self._pool: ThreadedConnectionPool | None = None

    @property
    def pool(self) -> ThreadedConnectionPool:
        """Get or create connection pool."""
        if self._pool is None:
            self._pool = ThreadedConnectionPool(
                self.min_connections,
                self.max_connections,
                self.database_url
            )
        return self._pool

    def _get_connection(self):
        """Get a connection from the pool."""
        return self.pool.getconn()

    def _put_connection(self, conn):
        """Return a connection to the pool."""
        self.pool.putconn(conn)

    def initialize(self) -> None:
        """Create database tables."""
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                # Nodes table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS nodes (
                        node_id BIGINT PRIMARY KEY,
                        data JSONB NOT NULL
                    )
                """)

                # References table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS refs (
                        ref_id BIGINT PRIMARY KEY,
                        data JSONB NOT NULL
                    )
                """)

                # Components table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS components (
                        comp_id BIGINT PRIMARY KEY,
                        type TEXT NOT NULL,
                        data JSONB NOT NULL
                    )
                """)
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_components_type ON components(type)
                """)

                # Settings table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS settings (
                        key TEXT PRIMARY KEY,
                        data JSONB NOT NULL
                    )
                """)

                # Menus table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS menus (
                        menu_id BIGINT PRIMARY KEY,
                        data JSONB NOT NULL
                    )
                """)

                # Footers table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS footers (
                        footer_id BIGINT PRIMARY KEY,
                        data JSONB NOT NULL
                    )
                """)

                # Custom themes table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS custom_themes (
                        theme_id BIGINT PRIMARY KEY,
                        data JSONB NOT NULL
                    )
                """)

                conn.commit()
        finally:
            self._put_connection(conn)

    def generate_id(self) -> int:
        """Generate a random ID."""
        return random.randint(0, 0xFFFFFFFF)

    def close(self) -> None:
        """Close all connections in the pool."""
        if self._pool:
            self._pool.closeall()
            self._pool = None

    # Node operations
    def get_node(self, node_id: int) -> dict[str, Any] | None:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM nodes WHERE node_id = %s", (node_id,))
                row = cursor.fetchone()
                if row:
                    return row["data"]
                return None
        finally:
            self._put_connection(conn)

    def save_node(self, node: dict[str, Any]) -> None:
        node_id = node.get("node_id")
        if not node_id:
            raise ValueError("Node must have node_id")
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO nodes (node_id, data) VALUES (%s, %s)
                    ON CONFLICT (node_id) DO UPDATE SET data = EXCLUDED.data
                    """,
                    (node_id, json.dumps(node))
                )
                conn.commit()
        finally:
            self._put_connection(conn)

    def delete_node(self, node_id: int) -> bool:
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM nodes WHERE node_id = %s", (node_id,))
                conn.commit()
                return cursor.rowcount > 0
        finally:
            self._put_connection(conn)

    def list_nodes(self) -> list[dict[str, Any]]:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM nodes")
                return [row["data"] for row in cursor.fetchall()]
        finally:
            self._put_connection(conn)

    # Reference operations
    def get_reference(self, ref_id: int) -> dict[str, Any] | None:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM refs WHERE ref_id = %s", (ref_id,))
                row = cursor.fetchone()
                if row:
                    return row["data"]
                return None
        finally:
            self._put_connection(conn)

    def save_reference(self, reference: dict[str, Any]) -> None:
        ref_id = reference.get("ref_id")
        if not ref_id:
            raise ValueError("Reference must have ref_id")
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO refs (ref_id, data) VALUES (%s, %s)
                    ON CONFLICT (ref_id) DO UPDATE SET data = EXCLUDED.data
                    """,
                    (ref_id, json.dumps(reference))
                )
                conn.commit()
        finally:
            self._put_connection(conn)

    def delete_reference(self, ref_id: int) -> bool:
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM refs WHERE ref_id = %s", (ref_id,))
                conn.commit()
                return cursor.rowcount > 0
        finally:
            self._put_connection(conn)

    def list_references(self) -> list[dict[str, Any]]:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM refs")
                return [row["data"] for row in cursor.fetchall()]
        finally:
            self._put_connection(conn)

    # Component operations
    def get_component(self, comp_id: int) -> dict[str, Any] | None:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM components WHERE comp_id = %s", (comp_id,))
                row = cursor.fetchone()
                if row:
                    return row["data"]
                return None
        finally:
            self._put_connection(conn)

    def get_component_by_type(self, component_type: str, comp_id: int) -> dict[str, Any] | None:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute(
                    "SELECT data FROM components WHERE comp_id = %s AND type = %s",
                    (comp_id, component_type)
                )
                row = cursor.fetchone()
                if row:
                    return row["data"]
                return None
        finally:
            self._put_connection(conn)

    def save_component(self, component: dict[str, Any]) -> None:
        comp_type = component.get("type")
        comp_id = component.get("comp_id")
        if not comp_type or not comp_id:
            raise ValueError("Component must have type and comp_id")
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO components (comp_id, type, data) VALUES (%s, %s, %s)
                    ON CONFLICT (comp_id) DO UPDATE SET type = EXCLUDED.type, data = EXCLUDED.data
                    """,
                    (comp_id, comp_type, json.dumps(component))
                )
                conn.commit()
        finally:
            self._put_connection(conn)

    def delete_component(self, component_type: str, comp_id: int) -> bool:
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM components WHERE comp_id = %s AND type = %s",
                    (comp_id, component_type)
                )
                conn.commit()
                return cursor.rowcount > 0
        finally:
            self._put_connection(conn)

    def list_components(self) -> dict[str, list[dict[str, Any]]]:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT type, data FROM components ORDER BY type")
                components: dict[str, list[dict[str, Any]]] = {}
                for row in cursor.fetchall():
                    comp_type = row["type"]
                    if comp_type not in components:
                        components[comp_type] = []
                    components[comp_type].append(row["data"])
                return components
        finally:
            self._put_connection(conn)

    # Settings operations
    def _get_setting(self, key: str, default: dict[str, Any]) -> dict[str, Any]:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM settings WHERE key = %s", (key,))
                row = cursor.fetchone()
                if row:
                    return row["data"]
                return default
        finally:
            self._put_connection(conn)

    def _save_setting(self, key: str, data: dict[str, Any]) -> None:
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO settings (key, data) VALUES (%s, %s)
                    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
                    """,
                    (key, json.dumps(data))
                )
                conn.commit()
        finally:
            self._put_connection(conn)

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
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM menus WHERE menu_id = %s", (menu_id,))
                row = cursor.fetchone()
                if row:
                    return row["data"]
                return None
        finally:
            self._put_connection(conn)

    def save_menu(self, menu: dict[str, Any]) -> None:
        menu_id = menu.get("menu_id")
        if not menu_id:
            raise ValueError("Menu must have menu_id")
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO menus (menu_id, data) VALUES (%s, %s)
                    ON CONFLICT (menu_id) DO UPDATE SET data = EXCLUDED.data
                    """,
                    (menu_id, json.dumps(menu))
                )
                conn.commit()
        finally:
            self._put_connection(conn)

    def delete_menu(self, menu_id: int) -> bool:
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM menus WHERE menu_id = %s", (menu_id,))
                conn.commit()
                return cursor.rowcount > 0
        finally:
            self._put_connection(conn)

    def list_menus(self) -> list[dict[str, Any]]:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM menus")
                return [row["data"] for row in cursor.fetchall()]
        finally:
            self._put_connection(conn)

    # Footer operations
    def get_footer(self, footer_id: int) -> dict[str, Any] | None:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM footers WHERE footer_id = %s", (footer_id,))
                row = cursor.fetchone()
                if row:
                    return row["data"]
                return None
        finally:
            self._put_connection(conn)

    def save_footer(self, footer: dict[str, Any]) -> None:
        footer_id = footer.get("footer_id")
        if not footer_id:
            raise ValueError("Footer must have footer_id")
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO footers (footer_id, data) VALUES (%s, %s)
                    ON CONFLICT (footer_id) DO UPDATE SET data = EXCLUDED.data
                    """,
                    (footer_id, json.dumps(footer))
                )
                conn.commit()
        finally:
            self._put_connection(conn)

    def delete_footer(self, footer_id: int) -> bool:
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM footers WHERE footer_id = %s", (footer_id,))
                conn.commit()
                return cursor.rowcount > 0
        finally:
            self._put_connection(conn)

    def list_footers(self) -> list[dict[str, Any]]:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM footers")
                return [row["data"] for row in cursor.fetchall()]
        finally:
            self._put_connection(conn)

    # Custom theme operations
    def get_custom_theme(self, theme_id: int) -> dict[str, Any] | None:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM custom_themes WHERE theme_id = %s", (theme_id,))
                row = cursor.fetchone()
                if row:
                    return row["data"]
                return None
        finally:
            self._put_connection(conn)

    def save_custom_theme(self, theme: dict[str, Any]) -> None:
        theme_id = theme.get("theme_id")
        if not theme_id:
            raise ValueError("Theme must have theme_id")
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO custom_themes (theme_id, data) VALUES (%s, %s)
                    ON CONFLICT (theme_id) DO UPDATE SET data = EXCLUDED.data
                    """,
                    (theme_id, json.dumps(theme))
                )
                conn.commit()
        finally:
            self._put_connection(conn)

    def delete_custom_theme(self, theme_id: int) -> bool:
        conn = self._get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM custom_themes WHERE theme_id = %s", (theme_id,))
                conn.commit()
                return cursor.rowcount > 0
        finally:
            self._put_connection(conn)

    def list_custom_themes(self) -> list[dict[str, Any]]:
        conn = self._get_connection()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute("SELECT data FROM custom_themes")
                return [row["data"] for row in cursor.fetchall()]
        finally:
            self._put_connection(conn)
