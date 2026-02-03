from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageOps

from .database import (
    COMPONENT_DIR,
    FOOTER_DIR,
    HOME_FILE,
    MENU_DIR,
    NODE_DIR,
    REFERENCE_DIR,
    PURPOSE_DIR,
    CUSTOM_COMPONENT_DIR,
    SITE_FILE,
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
    purposes = list_json_files(PURPOSE_DIR)
    custom_components = list_json_files(CUSTOM_COMPONENT_DIR)
    site = read_json(
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
            "social_image_border_enabled": False,
            "social_image_border_color": "#0f172a",
            "social_image_border_width": 16,
            "social_image_border_radius": 24,
            "robots": "index,follow",
            "favicon_src": "",
        },
    )

    site = _apply_social_image_border(site)
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
            "site": site,
            "menu": menu,
            "footer": footer,
            "purposes": purposes,
            "customComponents": custom_components,
            "themes": themes,
            "themeConfig": theme_config,
        },
        "assets": assets,
    }

    write_json(Path("content/metadata.json"), metadata)
    return metadata


def _apply_social_image_border(site: dict[str, Any]) -> dict[str, Any]:
    if not site.get("social_image_border_enabled"):
        return site

    src = str(site.get("social_image_url") or "").strip()
    if not src:
        return site

    if not src.startswith("/"):
        return site

    source_path = Path("public") / src.lstrip("/")
    if not source_path.exists():
        return site

    try:
        border_width = int(site.get("social_image_border_width") or 0)
    except (TypeError, ValueError):
        border_width = 0

    try:
        border_radius = int(site.get("social_image_border_radius") or 0)
    except (TypeError, ValueError):
        border_radius = 0

    if border_width <= 0:
        return site

    border_color = str(site.get("social_image_border_color") or "#0f172a")

    try:
        image = Image.open(source_path).convert("RGBA")
        bordered = ImageOps.expand(image, border=border_width, fill=border_color)
        if border_radius > 0:
            outer_radius = min(border_radius, min(bordered.size) // 2)
            inner_radius = max(border_radius - border_width, 0)
            inner_radius = min(inner_radius, min(image.size) // 2)

            canvas = Image.new("RGBA", bordered.size, border_color)
            content_mask = Image.new("L", image.size, 0)
            content_draw = ImageDraw.Draw(content_mask)
            if inner_radius > 0:
                content_draw.rounded_rectangle(
                    (0, 0, image.size[0] - 1, image.size[1] - 1),
                    radius=inner_radius,
                    fill=255,
                )
            else:
                content_draw.rectangle(
                    (0, 0, image.size[0] - 1, image.size[1] - 1),
                    fill=255,
                )

            canvas.paste(image, (border_width, border_width), content_mask)

            outer_mask = Image.new("L", bordered.size, 0)
            outer_draw = ImageDraw.Draw(outer_mask)
            outer_draw.rounded_rectangle(
                (0, 0, bordered.size[0] - 1, bordered.size[1] - 1),
                radius=outer_radius,
                fill=255,
            )
            rounded = Image.new("RGBA", bordered.size)
            rounded.paste(canvas, (0, 0), outer_mask)
            bordered = rounded

        output_dir = Path("public") / "og"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_ext = ".png" if border_radius > 0 else source_path.suffix
        output_name = (
            f"social-border-{source_path.stem}-{border_width}-{border_radius}-{border_color.lstrip('#')}{output_ext}"
        )
        output_path = output_dir / output_name
        if output_ext in {".jpg", ".jpeg"} and bordered.mode in {"RGBA", "LA"}:
            bordered = bordered.convert("RGB")
        bordered.save(output_path)
        next_site = dict(site)
        next_site["social_image_url"] = f"/og/{output_name}"
        return next_site
    except Exception:
        return site


if __name__ == "__main__":
    export_metadata()
