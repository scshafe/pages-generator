"""Base storage adapter interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class StorageAdapter(ABC):
    """Abstract base class for storage adapters."""

    # Node operations
    @abstractmethod
    def get_node(self, node_id: int) -> dict[str, Any] | None:
        """Get a node by ID."""
        pass

    @abstractmethod
    def save_node(self, node: dict[str, Any]) -> None:
        """Save a node."""
        pass

    @abstractmethod
    def delete_node(self, node_id: int) -> bool:
        """Delete a node by ID. Returns True if deleted."""
        pass

    @abstractmethod
    def list_nodes(self) -> list[dict[str, Any]]:
        """List all nodes."""
        pass

    # Reference operations
    @abstractmethod
    def get_reference(self, ref_id: int) -> dict[str, Any] | None:
        """Get a reference by ID."""
        pass

    @abstractmethod
    def save_reference(self, reference: dict[str, Any]) -> None:
        """Save a reference."""
        pass

    @abstractmethod
    def delete_reference(self, ref_id: int) -> bool:
        """Delete a reference by ID. Returns True if deleted."""
        pass

    @abstractmethod
    def list_references(self) -> list[dict[str, Any]]:
        """List all references."""
        pass

    # Component operations
    @abstractmethod
    def get_component(self, comp_id: int) -> dict[str, Any] | None:
        """Get a component by ID (searches all types)."""
        pass

    @abstractmethod
    def get_component_by_type(self, component_type: str, comp_id: int) -> dict[str, Any] | None:
        """Get a component by type and ID."""
        pass

    @abstractmethod
    def save_component(self, component: dict[str, Any]) -> None:
        """Save a component. Must have 'type' and 'comp_id' fields."""
        pass

    @abstractmethod
    def delete_component(self, component_type: str, comp_id: int) -> bool:
        """Delete a component by type and ID. Returns True if deleted."""
        pass

    @abstractmethod
    def list_components(self) -> dict[str, list[dict[str, Any]]]:
        """List all components grouped by type."""
        pass

    # Settings operations
    @abstractmethod
    def get_home_settings(self) -> dict[str, Any]:
        """Get home settings."""
        pass

    @abstractmethod
    def save_home_settings(self, settings: dict[str, Any]) -> None:
        """Save home settings."""
        pass

    @abstractmethod
    def get_site_settings(self) -> dict[str, Any]:
        """Get site settings."""
        pass

    @abstractmethod
    def save_site_settings(self, settings: dict[str, Any]) -> None:
        """Save site settings."""
        pass

    @abstractmethod
    def get_theme_config(self) -> dict[str, Any]:
        """Get theme configuration."""
        pass

    @abstractmethod
    def save_theme_config(self, config: dict[str, Any]) -> None:
        """Save theme configuration."""
        pass

    # Menu operations
    @abstractmethod
    def get_menu(self, menu_id: int) -> dict[str, Any] | None:
        """Get a menu by ID."""
        pass

    @abstractmethod
    def save_menu(self, menu: dict[str, Any]) -> None:
        """Save a menu."""
        pass

    @abstractmethod
    def delete_menu(self, menu_id: int) -> bool:
        """Delete a menu by ID. Returns True if deleted."""
        pass

    @abstractmethod
    def list_menus(self) -> list[dict[str, Any]]:
        """List all menus."""
        pass

    # Footer operations
    @abstractmethod
    def get_footer(self, footer_id: int) -> dict[str, Any] | None:
        """Get a footer by ID."""
        pass

    @abstractmethod
    def save_footer(self, footer: dict[str, Any]) -> None:
        """Save a footer."""
        pass

    @abstractmethod
    def delete_footer(self, footer_id: int) -> bool:
        """Delete a footer by ID. Returns True if deleted."""
        pass

    @abstractmethod
    def list_footers(self) -> list[dict[str, Any]]:
        """List all footers."""
        pass

    # Custom theme operations
    @abstractmethod
    def get_custom_theme(self, theme_id: int) -> dict[str, Any] | None:
        """Get a custom theme by ID."""
        pass

    @abstractmethod
    def save_custom_theme(self, theme: dict[str, Any]) -> None:
        """Save a custom theme."""
        pass

    @abstractmethod
    def delete_custom_theme(self, theme_id: int) -> bool:
        """Delete a custom theme by ID. Returns True if deleted."""
        pass

    @abstractmethod
    def list_custom_themes(self) -> list[dict[str, Any]]:
        """List all custom themes."""
        pass

    # Initialization
    @abstractmethod
    def initialize(self) -> None:
        """Initialize the storage (create tables, directories, etc.)."""
        pass

    # Utility
    @abstractmethod
    def generate_id(self) -> int:
        """Generate a unique ID."""
        pass
