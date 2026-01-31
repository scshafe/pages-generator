# Author vs Publish Modes, Routing, and Build Pipeline

## Runtime Modes

### Author Mode
Author mode is the interactive, write-enabled experience used during development.

**UI differences**
- Author UI elements are visible (editing controls, add-component modal, settings panels).
- Cards display component headers with type + edit/delete controls.
- Drag-and-drop reordering is enabled.
- Header shows the “Author Mode” pill.

**Data access**
- Reads/writes are made through the Flask API (`/nodes`, `/references`, `/components`, etc.).
- Edits write to JSON on disk under `content/`.
- Asset operations use the author API (`/save-image`, `/upload-pdf`, `/fetch-image`).

**Routing**
- Uses the same Next.js App Router as publish mode.
- Dynamic view routing uses `app/[[...viewPath]]/page.tsx`.
- View resolution uses API calls in `lib/content/views.server.ts`.

### Publish Mode
Publish mode is static and read-only.

**UI differences**
- Author-only controls are hidden (no edit, delete, add forms, or drag handles).
- Only the content view is rendered.

**Data access**
- Uses a metadata snapshot (`content/metadata.json`) created at build time.
- `lib/content/views.server.ts` resolves views locally from the snapshot.
- No API calls or write operations are used.
- Site metadata (favicon, social image, language) is read from `settings.site` in the snapshot.
- When social image border is enabled, export creates a bordered image under `public/og/` using the configured width and radius, and the snapshot uses it.

**Routing**
- The catch-all view route pre-generates static pages using `generateStaticParams`.
- Root (`/`) is included if a home root view is configured even without an explicit `/` view path.

## How Routing Works

**View routing**
- `app/[[...viewPath]]/page.tsx` resolves the path and renders a view.
- `getResolvedViewByPath` in `lib/content/views.server.ts`:
  - Author mode: fetches view metadata and resolved nodes via API.
  - Publish mode: loads from metadata snapshot.

**Settings route**
- `app/settings/page.tsx` is available in author mode; it is still statically built but is not used in publish.

## Build Pipeline (Static Export)

1. **Export metadata**
   - `npm run export:metadata` runs `backend/export_metadata.py`.
   - Generates `content/metadata.json` containing nodes, references, components, settings (including site), and assets.

2. **Next.js static export**
   - `npm run build` runs `next build` with `output: "export"`.
   - The catch-all view route is pre-rendered using metadata.
   - Static HTML, JS, and assets are written to `out/` then copied into `.static-out/`.

3. **Serving**
   - `.static-out/` is the isolated static output used for preview and deployment.
   - New content requires a rebuild to update the snapshot and static pages.

## External Build Output

For a separate deploy repo, use the export script:

1. Configure `build-output.config.json` with `outputDir` pointing to the external repo.
2. Run `npm run build:export` to copy `out/` into that directory.
3. The script preserves the destination `.git` directory and refuses to copy into this repo.

## Automated Timestamp Publish

Use the timestamp publish script to insert a build timestamp into the root view, build, export, commit, and push:

- `npm run publish:timestamp`

This uses `scripts/add-build-timestamp.mjs` to update the root view’s child list with a `PlainTextUnit` showing the build time.

## Key Files
- Author UI and routing: `app/[[...viewPath]]/page.tsx`, `app/settings/page.tsx`
- View resolution: `lib/content/views.server.ts`
- Snapshot export: `backend/export_metadata.py`
- Static build config: `next.config.mjs`
- External build export: `build-output.config.json`, `scripts/export-build.mjs`
