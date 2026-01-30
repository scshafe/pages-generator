# Implementation Plan

This plan implements a single-app authoring experience that builds to a fully static output with `index.html` at the root. The same codebase runs in author mode locally and in static mode after build.

## Status

The current implementation uses **Next.js App Router + Flask** (author API) with static export in publish mode. Some of the stack choices below (Vite + Node API) are historical planning notes rather than the active architecture.

## Objectives

- Author mode runs locally with read/write data access.
- Build output is a static file repository with `index.html` at the root.
- Data access is decoupled via interfaces so storage modules are swappable.
- Build pipeline exports content snapshots for static runtime use.

## Proposed Stack (Primary)

- UI: React + TypeScript
- Build tooling: Vite
- Local author API: minimal Node server (Express or Fastify) used only in author mode
- Storage adapters: JSON file adapter first, then SQLite, Postgres, Cosmos
- File store adapters: local filesystem first, then S3-compatible, Azure Blob, or GCS

## Alternatives (for each major framework)

- UI framework alternatives: Svelte (SvelteKit), Vue (Vite + Vue), Solid (Vite + Solid)
- App framework alternatives: Astro (SSG + islands), SvelteKit with `adapter-static`, Next.js static export
- Author API alternatives: Hono, Fastify, Express
- DB access alternatives: Prisma ORM vs direct drivers

## Runtime Modes

- Author mode (local):
  - Starts the author API server and the Vite dev server.
  - Enables write operations and local file uploads.
- Static mode (build output):
  - No API server.
  - App reads snapshot data from `dist/data/`.
  - Author UI is hidden or disabled.

## Configuration

Environment variables (loaded via `.env` and `.env.local`):

- `APP_MODE=author|static`
- `DATA_DRIVER=json|sqlite|postgres|cosmos|static`
- `DATA_PATH=./data` (json or sqlite file path)
- `DATABASE_URL=` (postgres)
- `COSMOS_ENDPOINT=`, `COSMOS_KEY=`, `COSMOS_DB=`, `COSMOS_CONTAINER=`
- `FILESTORE_DRIVER=local|s3|azure|gcs`
- `FILESTORE_PATH=./data/assets`
- `S3_ENDPOINT=`, `S3_BUCKET=`, `S3_REGION=`, `S3_ACCESS_KEY=`, `S3_SECRET_KEY=`
- `AZURE_STORAGE_ACCOUNT=`, `AZURE_STORAGE_KEY=`, `AZURE_CONTAINER=`
- `BUILD_OUTPUT_DIR=dist`
- `EXPORT_MODE=json|ssg`
- `VITE_APP_MODE=author|static` (client-safe)
- `VITE_BASE_URL=/` (client-safe)

## Data Model (domain-focused)

- `ContentItem`: `id`, `slug`, `title`, `body`, `excerpt`, `tags`, `status`, `createdAt`, `updatedAt`, `publishedAt`, `assets`
- `Asset`: `id`, `filename`, `path`, `mimeType`, `size`, `createdAt`
- `Taxonomy`: `id`, `name`, `slug`, `type`
- `SiteSettings`: `title`, `description`, `theme`, `navigation`

## Interfaces (ports)

- `ContentStore`
  - `list(filters)`
  - `get(id)`
  - `saveDraft(item)`
  - `publish(id)`
  - `delete(id)`
- `AssetStore`
  - `upload(file)`
  - `get(id)`
  - `delete(id)`
- `ExportStore`
  - `writeSnapshot(content, assets, settings)`

## Adapter Strategy

Start with JSON + local file store, then expand:

- JSON adapter
  - Best for local authoring, transparent and easy to diff.
- SQLite adapter
  - Single-file DB, transactional, solid for local authoring.
- Postgres adapter
  - Remote storage, concurrency, and indexing.
- Cosmos adapter
  - Global availability, higher complexity and cost.

File store adapters:

- Local filesystem in author mode.
- S3-compatible store for remote asset hosting.
- Azure Blob or GCS as alternatives.

## Build / Export Pipeline

1. Read all content from the active adapter.
2. Normalize and validate data.
3. Write `dist/data/*.json` snapshots (or pre-rendered HTML if `EXPORT_MODE=ssg`).
4. Generate `dist/manifest.json` with build metadata.
5. Ensure `dist/index.html` exists at root.

## UX Structure

- Global layout: left nav + top bar + main editor pane.
- Content list with filters and status indicators.
- Editor with autosave, preview toggle, and metadata side panel.
- Media manager with upload progress and usage references.
- Publish/build flow with clear status and error handling.

## Detailed Implementation Tasks

### Phase 1: Project scaffolding

- Create Vite + React + TypeScript project.
- Set up routing (React Router or TanStack Router).
- Add base layout, navigation, and placeholder pages.

### Phase 2: Core domain and interfaces

- Implement domain types and validation utilities.
- Define ports (`ContentStore`, `AssetStore`, `ExportStore`).
- Implement use cases in a framework-agnostic folder.

### Phase 3: Author API server

- Implement thin routes that map to use cases.
- Only expose author endpoints in author mode.
- Add file upload endpoint backed by `AssetStore`.

### Phase 4: Storage adapters

- JSON adapter for content and assets.
- Local file store for assets.
- Add SQLite adapter and ensure migrations.
- Add Postgres adapter.
- Add Cosmos adapter.

### Phase 5: UI authoring features

- Content list and filter UX.
- Editor with autosave and status handling.
- Metadata and slug editor.
- Media manager.

### Phase 6: Static export

- Build export pipeline and snapshot generator.
- Static runtime uses snapshot data.
- Disable write paths and author UI in static mode.

### Phase 7: Hardening

- Error boundaries and toast notifications.
- Validation and conflict handling.
- Local backups and export validation.
- Optional search index generation.

## Risks and Mitigations

- Static deploy cannot write: enforce `APP_MODE=static` to hide author UI and disable write paths.
- Large datasets in JSON: mitigate by switching to SQLite or Postgres.
- Build-time data sync: ensure export step has read access to remote DB.
- SPA routing in static hosts: configure fallback to `index.html`.

## Testing Strategy

- Unit tests for use cases and adapters.
- Integration tests for author API endpoints.
- E2E tests for author flows (list/edit/publish).

## Deliverables

- Single app running in author mode locally.
- Static build output with `index.html` at root.
- Pluggable storage and file store adapters.
- Documented config variables and runtime modes.

## Implementation Checklist

- [ ] Confirm framework choice and primary alternatives.
- [ ] Scaffold Vite + React + TypeScript project.
- [ ] Set up routing and base layout shell.
- [ ] Define domain types and validation utilities.
- [ ] Define ports: `ContentStore`, `AssetStore`, `ExportStore`.
- [ ] Implement use cases in a framework-agnostic layer.
- [ ] Build author API server with thin routes.
- [ ] Implement JSON content adapter.
- [ ] Implement local filesystem asset store.
- [ ] Build author UI: content list, editor, metadata panel.
- [ ] Add autosave and draft/publish flows.
- [ ] Add media manager with upload flow.
- [ ] Implement static export pipeline.
- [ ] Serve static runtime from snapshot data.
- [ ] Guard author-only features in static mode.
- [ ] Add SQLite adapter.
- [ ] Add Postgres adapter.
- [ ] Add Cosmos adapter.
- [ ] Add remote file store adapters (S3/Azure/GCS).
- [ ] Add error boundaries and user-facing notifications.
- [ ] Add validation and conflict handling.
- [ ] Add tests: unit, integration, E2E.
- [ ] Document environment variables and deployment steps.
