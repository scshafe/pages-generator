"""Storage adapters for the blog application."""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

from .base import StorageAdapter
from .json_adapter import JSONStorageAdapter
from .sqlite_adapter import SQLiteStorageAdapter

# Optional PostgreSQL adapter (requires psycopg2)
try:
    from .postgres_adapter import PostgresStorageAdapter
    _HAS_POSTGRES = True
except ImportError:
    PostgresStorageAdapter = None  # type: ignore
    _HAS_POSTGRES = False

__all__ = [
    "StorageAdapter",
    "JSONStorageAdapter",
    "SQLiteStorageAdapter",
    "PostgresStorageAdapter",
    "get_storage_adapter",
]

# Global storage adapter instance
_storage: StorageAdapter | None = None


def get_storage_adapter() -> StorageAdapter:
    """Get the configured storage adapter.

    Uses DATA_DRIVER environment variable to determine which adapter to use:
    - 'json' (default): JSON file storage
    - 'sqlite': SQLite database storage
    - 'postgres': PostgreSQL database storage (requires psycopg2)

    Additional environment variables:
    - DATA_PATH: Path to content directory (json) or database file (sqlite)
    - DATABASE_URL: PostgreSQL connection URL (postgres)
    """
    global _storage

    if _storage is not None:
        return _storage

    driver = os.environ.get("DATA_DRIVER", "json").lower()
    data_path = os.environ.get("DATA_PATH", "./content")

    if driver == "json":
        _storage = JSONStorageAdapter(Path(data_path))
    elif driver == "sqlite":
        db_path = os.environ.get("SQLITE_PATH", "./data/blog.db")
        _storage = SQLiteStorageAdapter(Path(db_path))
    elif driver == "postgres":
        from .postgres_adapter import PostgresStorageAdapter
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable required for postgres driver")
        _storage = PostgresStorageAdapter(database_url)
    else:
        raise ValueError(f"Unknown storage driver: {driver}")

    _storage.initialize()
    return _storage


def reset_storage_adapter() -> None:
    """Reset the global storage adapter (useful for testing)."""
    global _storage
    _storage = None
