# Blog App

A Next.js static site with an authoring UI backed by a Flask JSON API. It supports two modes:

- **Author Mode**: edit content locally via the API.
- **Publish Mode**: export a fully static site to `out/` for deployment.

## Requirements

- Node.js 18+
- Python 3.10+

## Setup

```bash
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

## Local

### Author Mode (Local Editing)

Runs Next.js + Flask API together.

```bash
npm run author
```

- Next.js: `http://localhost:4000`
- API: `http://localhost:4001`

Content is stored in `content/` and is **ignored by git** by default.

### Debug Mode

Run Next.js and Flask in separate terminals for easier debugging.

Terminal 1:

```bash
PORT=4000 npm run dev
```

Terminal 2:

```bash
AUTHOR_PORT=4001 python3 -m backend.server
```

## Publish Mode (Static Export)

```bash
npm run build
```

This runs:

1) `backend/export_metadata.py` → generates `content/metadata.json`
2) `next build` → generates static output in `out/`
3) The build script copies static output to `.static-out/`

Preview locally:

```bash
npm run preview
```

## Export Build to External Repo

Use this if you publish from a separate repo (e.g., GitHub Pages).

1) Set the output path in `build-output.config.json`.
2) Run:

```bash
npm run build:export
```

This copies `out/` to the external repo and preserves its `.git` directory. It also writes a `.nojekyll` file so `_next/` is served correctly on GitHub Pages.

## Environment Variables

Set in `.env.development` or `.env.production`.

- `NEXT_PUBLIC_BUILD_MODE`:
  - `author` for authoring UI
  - `publish` for static export
- `NEXT_PUBLIC_BASE_PATH` (optional):
  - Use when hosting under a subpath (e.g. `/my-repo`)
- `NEXT_PUBLIC_ASSET_PREFIX` (optional):
  - Usually the same as `NEXT_PUBLIC_BASE_PATH`

Example for GitHub Pages:

```
NEXT_PUBLIC_BUILD_MODE=publish
NEXT_PUBLIC_BASE_PATH=/my-repo
NEXT_PUBLIC_ASSET_PREFIX=/my-repo
```

## Site Settings

The **Site** tab in Settings persists metadata used for SEO and rich link previews:

- Favicon upload
- Social image (URL or upload)
- Rich preview fields (title, description, author, keywords, theme color)
- Optional **social image border** (generated at build time under `public/og/`)

## Navigation Links

Header/Footer items can reference views directly. If a nav item stores a `view_node_id`, the label and href are resolved at runtime from the current view configuration.

## Useful Commands

```bash
npm run build         # export metadata + static build
npm run build:export  # build + copy out/ to external repo
npm run build:timestamp # insert build timestamp text
npm run publish:timestamp # timestamp + build + export + commit + push
npm run push-static     # timestamp + build + export + commit + push
npm run preview       # serve static output from .static-out/
npm run smoke:author  # author mode smoke test
npm run smoke:views   # view resolution smoke test
```
