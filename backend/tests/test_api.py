"""Tests for Flask API endpoints."""

import json
import pytest
from pathlib import Path

from backend.server import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Create a test client with temporary data directory."""
    # Point the database to a temporary directory
    content_dir = tmp_path / "content"
    content_dir.mkdir()

    # Create required subdirectories
    for subdir in [
        "nodes",
        "references",
        "components",
        "settings",
        "settings/menu",
        "settings/footer",
        "settings/purposes",
        "settings/custom-components",
        "settings/themes",
        "settings/themes/custom",
    ]:
        (content_dir / subdir).mkdir(parents=True, exist_ok=True)

    # Patch the CONTENT_ROOT in database module
    import backend.database as db
    monkeypatch.setattr(db, "CONTENT_ROOT", content_dir)
    monkeypatch.setattr(db, "NODE_DIR", content_dir / "nodes")
    monkeypatch.setattr(db, "REFERENCE_DIR", content_dir / "references")
    monkeypatch.setattr(db, "COMPONENT_DIR", content_dir / "components")
    monkeypatch.setattr(db, "SETTINGS_DIR", content_dir / "settings")
    monkeypatch.setattr(db, "MENU_DIR", content_dir / "settings/menu")
    monkeypatch.setattr(db, "FOOTER_DIR", content_dir / "settings/footer")
    monkeypatch.setattr(db, "PURPOSE_DIR", content_dir / "settings/purposes")
    monkeypatch.setattr(db, "CUSTOM_COMPONENT_DIR", content_dir / "settings/custom-components")
    monkeypatch.setattr(db, "THEME_DIR", content_dir / "settings/themes")
    monkeypatch.setattr(db, "THEME_CONFIG", content_dir / "settings/themes/config.json")
    monkeypatch.setattr(db, "THEME_CUSTOM_DIR", content_dir / "settings/themes/custom")
    monkeypatch.setattr(db, "HOME_FILE", content_dir / "settings/home.json")
    monkeypatch.setattr(db, "SITE_FILE", content_dir / "settings/site.json")
    monkeypatch.setattr(db, "AI_SETTINGS_FILE", content_dir / "settings/ai.json")
    monkeypatch.setattr(db, "VIEW_STYLES_FILE", content_dir / "settings/view-styles.json")

    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestSiteEndpoints:
    """Tests for site settings endpoints."""

    def test_get_site_settings(self, client):
        """GET /site should return site settings."""
        response = client.get("/site")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "site_name" in data
        assert "tagline" in data

    def test_update_site_settings(self, client):
        """PUT /site should update site settings."""
        response = client.put(
            "/site",
            data=json.dumps({"site_name": "Test Site", "tagline": "Test Tagline"}),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["site_name"] == "Test Site"
        assert data["tagline"] == "Test Tagline"

        # Verify the update persisted
        response = client.get("/site")
        data = json.loads(response.data)
        assert data["site_name"] == "Test Site"


class TestAISettingsEndpoints:
    """Tests for AI settings endpoints."""

    def test_get_ai_settings(self, client):
        """GET /ai-settings should return AI settings."""
        response = client.get("/ai-settings")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "voice_tone" in data
        assert "voice_style" in data
        assert "ai_enabled" in data

    def test_update_ai_settings(self, client):
        """PUT /ai-settings should update AI settings."""
        response = client.put(
            "/ai-settings",
            data=json.dumps({
                "voice_tone": "casual",
                "voice_style": "detailed",
                "ai_enabled": False
            }),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["voice_tone"] == "casual"
        assert data["voice_style"] == "detailed"
        assert data["ai_enabled"] is False


class TestViewStylesEndpoints:
    """Tests for view styles endpoints."""

    def test_get_view_styles(self, client):
        """GET /view-styles should return view styles."""
        response = client.get("/view-styles")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "default_max_width" in data
        assert "default_padding" in data

    def test_update_view_styles(self, client):
        """PUT /view-styles should update view styles."""
        response = client.put(
            "/view-styles",
            data=json.dumps({
                "default_max_width": "1024px",
                "header_style": "hero"
            }),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["default_max_width"] == "1024px"
        assert data["header_style"] == "hero"


class TestThemeEndpoints:
    """Tests for theme endpoints."""

    def test_get_theme_config(self, client):
        """GET /themes/config should return theme configuration."""
        response = client.get("/themes/config")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "active_theme_id" in data
        assert "color_scheme" in data

    def test_update_theme_config(self, client):
        """PUT /themes/config should update theme configuration."""
        response = client.put(
            "/themes/config",
            data=json.dumps({"color_scheme": "dark"}),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["color_scheme"] == "dark"

    def test_create_custom_theme(self, client):
        """POST /themes/custom should create a custom theme."""
        response = client.post(
            "/themes/custom",
            data=json.dumps({"name": "My Custom Theme"}),
            content_type="application/json"
        )
        assert response.status_code == 201
        data = json.loads(response.data)
        assert "theme_id" in data
        assert data["name"] == "My Custom Theme"

    def test_list_custom_themes(self, client):
        """GET /themes/custom should list custom themes."""
        # Create a theme first
        client.post(
            "/themes/custom",
            data=json.dumps({"name": "Theme 1"}),
            content_type="application/json"
        )

        response = client.get("/themes/custom")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_delete_custom_theme(self, client):
        """DELETE /themes/custom/<id> should delete a custom theme."""
        # Create a theme first
        create_response = client.post(
            "/themes/custom",
            data=json.dumps({"name": "To Delete"}),
            content_type="application/json"
        )
        theme_id = json.loads(create_response.data)["theme_id"]

        # Delete it
        response = client.delete(f"/themes/custom/{theme_id}")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["deleted"] == theme_id


class TestHomeEndpoints:
    """Tests for home settings endpoints."""

    def test_get_root_view(self, client):
        """GET /home/root-view should return root view node ID."""
        response = client.get("/home/root-view")
        assert response.status_code == 200
        data = json.loads(response.data)
        assert "root_view_node_id" in data

    def test_update_root_view(self, client):
        """PUT /home/root-view should update root view node ID."""
        response = client.put(
            "/home/root-view",
            data=json.dumps({"root_view_node_id": 12345}),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["root_view_node_id"] == 12345
