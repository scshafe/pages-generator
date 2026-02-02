# Implementation Plan

This plan implements a single-app authoring experience that builds to a fully static output with `index.html` at the root. The same codebase runs in author mode locally and in static mode after build.

## Status

**Current Implementation**: Next.js App Router + Flask (Author API) with static export in publish mode.  
**Documentation Status**: See `docs/implementation/status.md` for detailed implementation status.

The current implementation has diverged from the original stack choices below (Vite + Node API). See the Implementation Status document for the actual architecture.

## Objectives

- Author mode runs locally with read/write data access.
- Build output is a static file repository with `index.html` at the root.
- Data access is decoupled via interfaces so storage modules are swappable.
- Build pipeline exports content snapshots for static runtime use.

## Proposed Stack (Primary - Historical Reference)

- UI: React + TypeScript
- Build tooling: Vite
- Local author API: minimal Node server (Express or Fastify) used only in author mode
- Storage adapters: JSON file adapter first, then SQLite, Postgres, Cosmos
- File store adapters: local filesystem first, then S3-compatible, Azure Blob, or GCS

**NOTE**: The actual implementation uses **Next.js + Flask** instead of Vite + Node API. See `docs/implementation/status.md` for details.

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

**NOTE**: The actual implementation uses a Node → Reference → Component entity system. See `ENTITY_UML_SCHEMA.md` for the complete data model.

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

### Phase 1: Project scaffolding ✅ COMPLETE

- [x] Create Next.js + React + TypeScript project.
- [x] Set up routing (React Router or TanStack Router).
- [x] Add base layout, navigation, and placeholder pages.

### Phase 2: Core domain and interfaces ✅ COMPLETE

- [x] Implement domain types and validation utilities.
- [x] Define ports (`ContentStore`, `AssetStore`, `ExportStore`).
- [x] Implement use cases in a framework-agnostic folder.

### Phase 3: Author API server ✅ COMPLETE

- [x] Implement thin routes that map to use cases.
- [x] Only expose author endpoints in author mode.
- [x] Add file upload endpoint backed by `AssetStore`.

### Phase 4: Storage adapters ✅ COMPLETE

- [x] JSON adapter for content and assets.
- [x] Local file store for assets.
- [x] SQLite adapter and ensure migrations.
- [x] Postgres adapter.
- [ ] Cosmos adapter (not prioritized).

### Phase 5: UI authoring features ✅ COMPLETE

- [x] Content list and filter UX.
- [x] Editor with autosave and status handling.
- [x] Metadata and slug editor.
- [x] Media manager.

### Phase 6: Static export ✅ COMPLETE

- [x] Build export pipeline and snapshot generator.
- [x] Static runtime uses snapshot data.
- [x] Disable write paths and author UI in static mode.

### Phase 7: Hardening ✅ COMPLETE

- [x] Error boundaries and toast notifications.
- [x] Validation and conflict handling.
- [x] Local backups and export validation.
- [x] Backend unit and integration tests.
- [ ] Optional search index generation (not prioritized).

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

- [x] Single app running in author mode locally.
- [x] Static build output with `index.html` at root.
- [ ] Pluggable storage and file store adapters (JSON implemented, others pending).
- [x] Documented config variables and runtime modes.

## Implementation Checklist

- [x] Confirm framework choice and primary alternatives.
- [x] Scaffold Vite + React + TypeScript project. (Next.js used instead)
- [x] Set up routing and base layout shell.
- [x] Define domain types and validation utilities.
- [x] Define ports: `ContentStore`, `AssetStore`, `ExportStore`.
- [x] Implement use cases in a framework-agnostic layer.
- [x] Build author API server with thin routes.
- [x] Implement JSON content adapter.
- [x] Implement local filesystem asset store.
- [x] Build author UI: content list, editor, metadata panel.
- [x] Add autosave and draft/publish flows.
- [x] Add media manager with upload flow.
- [x] Implement static export pipeline.
- [x] Serve static runtime from snapshot data.
- [x] Guard author-only features in static mode.
- [x] Add SQLite adapter.
- [x] Add Postgres adapter.
- [ ] Add Cosmos adapter (not prioritized).
- [ ] Add remote file store adapters (S3/Azure/GCS) (not prioritized).
- [x] Add error boundaries and user-facing notifications.
- [x] Add validation and conflict handling.
- [x] Add tests: unit, integration (34 backend tests).
- [ ] Add E2E tests (smoke tests provide basic coverage).
- [x] Document environment variables and deployment steps.
