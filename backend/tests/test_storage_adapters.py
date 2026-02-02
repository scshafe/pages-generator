"""Tests for storage adapters."""

import tempfile
import os
from pathlib import Path

import pytest

from backend.storage import JSONStorageAdapter, SQLiteStorageAdapter


class TestJSONStorageAdapter:
    """Tests for JSONStorageAdapter."""

    @pytest.fixture
    def adapter(self, tmp_path):
        """Create a JSON adapter with a temporary directory."""
        adapter = JSONStorageAdapter(tmp_path / "content")
        adapter.initialize()
        return adapter

    def test_initialize_creates_directories(self, adapter, tmp_path):
        """Initialize should create required directories."""
        assert (tmp_path / "content" / "nodes").exists()
        assert (tmp_path / "content" / "references").exists()
        assert (tmp_path / "content" / "components").exists()
        assert (tmp_path / "content" / "settings").exists()

    def test_node_operations(self, adapter):
        """Test CRUD operations for nodes."""
        node = {"node_id": 123, "ref_id": 456, "parent_node_id": None}

        # Save
        adapter.save_node(node)

        # Get
        retrieved = adapter.get_node(123)
        assert retrieved is not None
        assert retrieved["node_id"] == 123
        assert retrieved["ref_id"] == 456

        # List
        nodes = adapter.list_nodes()
        assert len(nodes) == 1
        assert nodes[0]["node_id"] == 123

        # Delete
        result = adapter.delete_node(123)
        assert result is True
        assert adapter.get_node(123) is None

        # Delete non-existent
        result = adapter.delete_node(999)
        assert result is False

    def test_reference_operations(self, adapter):
        """Test CRUD operations for references."""
        ref = {"ref_id": 456, "comp_id": 789, "overrides": {}}

        adapter.save_reference(ref)
        retrieved = adapter.get_reference(456)
        assert retrieved is not None
        assert retrieved["ref_id"] == 456
        assert retrieved["comp_id"] == 789

        refs = adapter.list_references()
        assert len(refs) == 1

        result = adapter.delete_reference(456)
        assert result is True
        assert adapter.get_reference(456) is None

    def test_component_operations(self, adapter):
        """Test CRUD operations for components."""
        component = {
            "comp_id": 789,
            "type": "Container",
            "config": {"path": "/test"}
        }

        adapter.save_component(component)

        # Get by ID (searches all types)
        retrieved = adapter.get_component(789)
        assert retrieved is not None
        assert retrieved["comp_id"] == 789
        assert retrieved["type"] == "Container"

        # Get by type and ID
        retrieved = adapter.get_component_by_type("Container", 789)
        assert retrieved is not None

        # List components grouped by type
        components = adapter.list_components()
        assert "Container" in components
        assert len(components["Container"]) == 1

        # Delete
        result = adapter.delete_component("Container", 789)
        assert result is True
        assert adapter.get_component(789) is None

    def test_settings_operations(self, adapter):
        """Test settings operations."""
        # Home settings
        adapter.save_home_settings({"label": "Test Home", "root_view_node_id": 123})
        home = adapter.get_home_settings()
        assert home["label"] == "Test Home"
        assert home["root_view_node_id"] == 123

        # Site settings
        adapter.save_site_settings({"site_name": "Test Site", "tagline": "Testing"})
        site = adapter.get_site_settings()
        assert site["site_name"] == "Test Site"
        assert site["tagline"] == "Testing"

        # Theme config
        adapter.save_theme_config({"active_theme_id": 1, "color_scheme": "dark"})
        theme = adapter.get_theme_config()
        assert theme["active_theme_id"] == 1
        assert theme["color_scheme"] == "dark"

    def test_menu_operations(self, adapter):
        """Test menu operations."""
        menu = {"menu_id": 100, "items": []}

        adapter.save_menu(menu)
        retrieved = adapter.get_menu(100)
        assert retrieved is not None
        assert retrieved["menu_id"] == 100

        menus = adapter.list_menus()
        assert len(menus) == 1

        result = adapter.delete_menu(100)
        assert result is True

    def test_footer_operations(self, adapter):
        """Test footer operations."""
        footer = {"footer_id": 200, "items": []}

        adapter.save_footer(footer)
        retrieved = adapter.get_footer(200)
        assert retrieved is not None

        footers = adapter.list_footers()
        assert len(footers) == 1

        result = adapter.delete_footer(200)
        assert result is True

    def test_custom_theme_operations(self, adapter):
        """Test custom theme operations."""
        theme = {"theme_id": 300, "name": "Custom Theme", "colors": {}}

        adapter.save_custom_theme(theme)
        retrieved = adapter.get_custom_theme(300)
        assert retrieved is not None
        assert retrieved["name"] == "Custom Theme"

        themes = adapter.list_custom_themes()
        assert len(themes) == 1

        result = adapter.delete_custom_theme(300)
        assert result is True

    def test_generate_id(self, adapter):
        """Test ID generation."""
        id1 = adapter.generate_id()
        id2 = adapter.generate_id()
        assert isinstance(id1, int)
        assert isinstance(id2, int)
        # IDs should be different (extremely unlikely to be same)
        assert id1 != id2


class TestSQLiteStorageAdapter:
    """Tests for SQLiteStorageAdapter."""

    @pytest.fixture
    def adapter(self, tmp_path):
        """Create a SQLite adapter with a temporary database."""
        db_path = tmp_path / "test.db"
        adapter = SQLiteStorageAdapter(db_path)
        adapter.initialize()
        return adapter

    def test_initialize_creates_database(self, adapter, tmp_path):
        """Initialize should create database file."""
        assert (tmp_path / "test.db").exists()

    def test_node_operations(self, adapter):
        """Test CRUD operations for nodes."""
        node = {"node_id": 123, "ref_id": 456, "parent_node_id": None}

        adapter.save_node(node)
        retrieved = adapter.get_node(123)
        assert retrieved is not None
        assert retrieved["node_id"] == 123

        nodes = adapter.list_nodes()
        assert len(nodes) == 1

        result = adapter.delete_node(123)
        assert result is True
        assert adapter.get_node(123) is None

    def test_reference_operations(self, adapter):
        """Test CRUD operations for references."""
        ref = {"ref_id": 456, "comp_id": 789, "overrides": {}}

        adapter.save_reference(ref)
        retrieved = adapter.get_reference(456)
        assert retrieved is not None
        assert retrieved["ref_id"] == 456

        refs = adapter.list_references()
        assert len(refs) == 1

        result = adapter.delete_reference(456)
        assert result is True

    def test_component_operations(self, adapter):
        """Test CRUD operations for components."""
        component = {
            "comp_id": 789,
            "type": "Container",
            "config": {"path": "/test"}
        }

        adapter.save_component(component)
        retrieved = adapter.get_component(789)
        assert retrieved is not None
        assert retrieved["type"] == "Container"

        components = adapter.list_components()
        assert "Container" in components

        result = adapter.delete_component("Container", 789)
        assert result is True

    def test_settings_operations(self, adapter):
        """Test settings operations."""
        adapter.save_home_settings({"label": "Test Home", "root_view_node_id": 123})
        home = adapter.get_home_settings()
        assert home["label"] == "Test Home"

        adapter.save_site_settings({"site_name": "Test Site"})
        site = adapter.get_site_settings()
        assert site["site_name"] == "Test Site"

        adapter.save_theme_config({"active_theme_id": 1, "color_scheme": "dark"})
        theme = adapter.get_theme_config()
        assert theme["active_theme_id"] == 1

    def test_update_existing_node(self, adapter):
        """Test updating an existing node."""
        node = {"node_id": 123, "ref_id": 456}
        adapter.save_node(node)

        # Update
        node["ref_id"] = 789
        adapter.save_node(node)

        retrieved = adapter.get_node(123)
        assert retrieved["ref_id"] == 789

        # Should still be only one node
        nodes = adapter.list_nodes()
        assert len(nodes) == 1


class TestStorageAdapterInterface:
    """Test that all adapters conform to the interface."""

    @pytest.fixture(params=["json", "sqlite"])
    def adapter(self, request, tmp_path):
        """Create adapters for testing."""
        if request.param == "json":
            adapter = JSONStorageAdapter(tmp_path / "content")
        else:
            adapter = SQLiteStorageAdapter(tmp_path / "test.db")
        adapter.initialize()
        return adapter

    def test_node_crud(self, adapter):
        """Test node CRUD across all adapters."""
        node = {"node_id": 123, "ref_id": 456}

        adapter.save_node(node)
        assert adapter.get_node(123) is not None
        assert adapter.delete_node(123) is True
        assert adapter.get_node(123) is None

    def test_reference_crud(self, adapter):
        """Test reference CRUD across all adapters."""
        ref = {"ref_id": 456, "comp_id": 789}

        adapter.save_reference(ref)
        assert adapter.get_reference(456) is not None
        assert adapter.delete_reference(456) is True
        assert adapter.get_reference(456) is None

    def test_component_crud(self, adapter):
        """Test component CRUD across all adapters."""
        comp = {"comp_id": 789, "type": "Container", "config": {}}

        adapter.save_component(comp)
        assert adapter.get_component(789) is not None
        assert adapter.delete_component("Container", 789) is True
        assert adapter.get_component(789) is None
