# Implementation Status

This document tracks the current implementation status of the blog app, comparing the original plan with what has been built.

## Executive Summary

**Stack**: Next.js App Router + Flask (Author API) with static export for publish mode  
**Status**: Core functionality implemented; authoring features mature; some planned features pending

---

## Architecture Overview

### Current Stack (Implemented)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14.2.5 (App Router) | React framework with SSR/SSG |
| **UI Library** | React 18.3.1 + TypeScript 5.6.3 | Component framework |
| **Author API** | Flask (Python) | Local read/write API for author mode |
| **Storage (Dev)** | JSON files in `content/` | Source of truth for development |
| **Storage (Prod)** | `metadata.json` snapshot | Generated at build time for static output |
| **Build Tools** | Next.js static export + custom scripts | Build pipeline with timestamp and export |
| **Development Server** | Next.js dev (port 4000) + Flask (port 4001) | Dual server setup via `npm run author` |

### Original Planned Stack (Historical Reference)

The original implementation-plan.md outlined a different stack:

- **UI**: React + TypeScript (same)
- **Build Tool**: Vite (changed to Next.js)
- **Local API**: Node/Express or Fastify (changed to Flask)
- **Storage**: JSON → SQLite → Postgres → Cosmos (JSON implemented)

**Rationale for Next.js + Flask:**
- Next.js App Router provides built-in routing and SSR/SSG capabilities
- Flask offers a simple, stable Python API for authoring operations
- JSON storage keeps the implementation simple and transparent

---

## Entity System (Fully Implemented)

The application uses a three-layer entity architecture for all content:

```
Node → ref_id → Reference → comp_id → Component
```

### Key Concepts

| Entity | Storage Location | Purpose |
|--------|------------------|---------|
| **Node** | `content/nodes/{node_id}.json` | Tree structure and sibling ordering |
| **Reference** | `content/references/{ref_id}.json` | Component references with overrides |
| **Component** | `content/components/{Type}/{comp_id}.json` | Component content and config |
| **Settings** | `content/settings/` | Site, menu, footer, theme, home configs |

### Views as Container Components

A View is represented as:
- A **Node** (root node for the view)
- Which has a **Reference**
- Which points to a **Container** with `config.path`
- Container children accessed via `config.child_node_id` linked list

### Component Types Implemented

| Category | Types | Status |
|----------|-------|--------|
| **Containers** | Container, Group, InlineContainer, ListContainer, StyleContainer, ViewContainer | ✅ Implemented |
| **Text Units** | PlainTextUnit, MarkdownUnit, CodeUnit, CodeBlockUnit | ✅ Implemented |
| **Structural Units** | DividerUnit, SectionUnit | ✅ Implemented |
| **Link Units** | LinkUnit | ✅ Implemented |
| **Alerts** | AlertUnit | ✅ Implemented |
| **Media** | ImageMedia, VideoMedia, PDFMedia | ✅ Implemented |
| **Experience** | ExperienceComponent | ✅ Implemented |
| **HTML/JS Components** | HtmlComponent, JsComponent | ❌ Not planned |

### Resolution Flow

1. Load root node by `node_id`
2. Load reference via `ref_id`
3. Load component via `comp_id`
4. For container components, walk linked list via `child_node_id` and `next_node_id`
5. Merge component `config` with reference `overrides`
6. Recursively resolve children

See `ENTITY_UML_SCHEMA.md` for complete UML diagram.

---

## Implementation Status by Phase

### Phase 1: Project Scaffolding ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Create Next.js + React + TypeScript project | ✅ Done | Using Next.js 14.2.5 with App Router |
| Set up routing | ✅ Done | `app/[[...viewPath]]/page.tsx` dynamic catch-all route |
| Add base layout, navigation | ✅ Done | `app/layout.tsx` with SiteHeader/SiteFooter |
| Settings page | ✅ Done | `app/settings/page.tsx` with panels for navigation, views, site |

### Phase 2: Core Domain and Interfaces ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Domain types and validation | ✅ Done | `lib/content/types.ts` defines Node, Reference, Component |
| View resolution logic | ✅ Done | `lib/content/views.server.ts` for server-side resolution |
| Container rendering | ✅ Done | `lib/content/containers.ts` for container-specific logic |

### Phase 3: Author API Server ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Flask server with read/write routes | ✅ Done | `backend/server.py` (55+ KB, comprehensive) |
| Entity CRUD operations | ✅ Done | Full CRUD for nodes, references, components |
| File upload endpoint | ✅ Done | Asset storage via `AssetPicker` component |
| Metadata export | ✅ Done | `backend/export_metadata.py` generates `metadata.json` |

### Phase 4: Storage Adapters ✅ COMPLETE

| Adapter | Status | Notes |
|---------|--------|-------|
| JSON adapter | ✅ Done | Primary storage in `content/` directory |
| SQLite adapter | ✅ Done | Full adapter with schema migration |
| Postgres adapter | ✅ Done | Connection pooling, JSONB storage |
| Cosmos adapter | ❌ Not started | Listed in original plan but not prioritized |

**Rationale**: JSON storage is default for local authoring. SQLite and Postgres adapters available via `DATA_DRIVER` environment variable.

### Phase 5: UI Authoring Features ✅ COMPLETE

| Feature | Status | Components |
|---------|--------|------------|
| Content list and filter | ✅ Done | ViewsPanel (`components/settings/ViewsPanel.tsx`) |
| Editor with inline editing | ✅ Done | `ComponentEditor.tsx`, `ViewComponentRenderer.tsx` |
| Metadata/slug editor | ✅ Done | EditableViewTitle for view titles |
| Media manager | ✅ Done | MediaPanel (`components/settings/MediaPanel.tsx`) |
| Component configuration panel | ✅ Done | ConfigurationPanel (`components/author/ConfigurationPanel.tsx`) |
| Drag and drop | ✅ Done | DragScopeProvider, DragScopeProvider |
| Author shortcuts | ✅ Done | AuthorShortcuts, useFocusNavigator |
| Inline menus | ✅ Done | useInlineMenuEvents, useInlineMenuState |
| Add component form | ✅ Done | AddComponentForm |

### Phase 6: Static Export ✅ COMPLETE

| Feature | Status | Implementation |
|---------|--------|----------------|
| Build export pipeline | ✅ Done | `scripts/isolate-static.mjs` copies `out/` to `.static-out/` |
| Snapshot generator | ✅ Done | `backend/export_metadata.py` generates `metadata.json` |
| Static runtime | ✅ Done | Build output serves from snapshot data |
| Author UI hidden in static | ✅ Done | Author components hidden in publish mode |

### Phase 7: Hardening ✅ PARTIAL

| Feature | Status | Notes |
|---------|--------|-------|
| Error boundaries | ✅ Done | ToastProvider (`components/ui/ToastProvider.tsx`) |
| Validation and conflict handling | ✅ Done | Backend validation in `server.py` |
| Local backups | ✅ Done | JSON files act as natural backup |
| Search index | ❌ Not started | Listed in original plan but not prioritized |
| Smoke tests | ✅ Done | `scripts/smoke-*.mjs` for author, export, views |

---

## Current Features (Implemented)

### Author Mode (Development)

| Feature | Description |
|---------|-------------|
| **Inline editing** | Click any text unit to edit in place |
| **Shortcuts** | Hyper+G creates sub-group; Hyper+U/P opens unit menu |
| **Edge markers** | Empty views show single marker; add first unit via click |
| **Editable view titles** | Inline editable view titles |
| **Auto-remove units** | Clearing all text removes unit automatically |
| **Enter key behavior** | Press Enter in text unit adds DividerUnit + new PlainTextUnit |
| **Configuration panel** | Floating panel shows settings for focused component |
| **AI toggle** | Components support `useAI` with optional prompt |
| **Reference AI** | References can enable `useAI` for flexible AI placement |
| **Drag and drop** | Reorder components via drag and drop |
| **Navigation focus** | Navigate between components via keyboard shortcuts |
| **Inline menus** | Contextual menus for adding/editing content |

### Publish Mode (Production)

| Feature | Description |
|---------|-------------|
| **Static HTML** | Fully static output in `.static-out/` directory |
| **metadata.json** | Snapshot of all content for static runtime |
| **No server required** | Static files served from any static host |
| **Author UI hidden** | Edit controls automatically hidden |

### Settings Management

| Panel | Features | Component |
|-------|----------|-----------|
| **Navigation** | Menu/footer items, view references | `NavigationPanel.tsx` |
| **Views** | List, edit, delete, reorder views | `ViewsPanel.tsx` |
| **Site** | Site metadata, SEO, social images | `SitePanel.tsx` |
| **Media** | Asset management | `MediaPanel.tsx` |
| **Shortcuts** | Keyboard shortcut reference | `ShortcutsPanel.tsx` |

### Build and Export

| Script | Purpose |
|--------|---------|
| `npm run author` | Start dual servers (Next.js + Flask) for authoring |
| `npm run build` | Export metadata + build static + isolate to `.static-out/` |
| `npm run build:export` | Build + export to external repo |
| `npm run build:timestamp` | Add build timestamp to home view |
| `npm run publish:timestamp` | Timestamp + build + export + git push |
| `npm run preview` | Preview static output with `serve` |
| `npm run data:reset-*` | Reset data to hard/minimal/example states |

---

## Pending Features (TODO)

Based on `TODO.md` and implementation gaps:

### Completed TODOs

| Task | Status | Notes |
|------|--------|-------|
| Voice Option (for tone) | ✅ Done | Implemented in AI Settings panel |
| View Style Defaults | ✅ Done | Implemented as Styles tab in Settings |
| SQLite adapter | ✅ Done | Full adapter with schema migration |
| Postgres adapter | ✅ Done | Connection pooling, JSONB storage |
| Unit/Integration tests | ✅ Done | 34 tests for storage and API |

### Not Started (Original Plan)

| Feature | Priority | Context |
|---------|----------|---------|
| Cosmos adapter | Low | Not needed for static deployment |
| Remote file stores (S3/Azure/GCS) | Low | Not needed for local authoring |
| Search index generation | Low | Not prioritized for static site |
| E2E tests | Low | Smoke tests cover basic functionality |

---

## Directory Structure

```
├── app/                      # Next.js App Router pages
│   ├── [[...viewPath]]/      # Dynamic catch-all route for views
│   ├── settings/             # Author-only settings page
│   ├── layout.tsx            # Root layout with header/footer
│   └── globals.css           # Global styles
├── backend/                  # Flask API server
│   ├── server.py             # API endpoints (55+ KB)
│   ├── database.py           # JSON storage helpers
│   ├── export_metadata.py    # Exports metadata.json snapshot
│   ├── reset_data.py         # Reset and seed data
│   └── routes/               # (empty, routes in server.py)
├── components/
│   ├── author/               # Author-only UI
│   │   ├── AddComponentForm.tsx
│   │   ├── ComponentEditor.tsx
│   │   ├── ConfigurationPanel.tsx
│   │   ├── ContainerFocusProvider.tsx
│   │   └── AssetPicker.tsx
│   ├── settings/             # Settings panels
│   │   ├── NavigationPanel.tsx
│   │   ├── ViewsPanel.tsx
│   │   ├── SitePanel.tsx
│   │   ├── MediaPanel.tsx
│   │   ├── ShortcutsPanel.tsx
│   │   └── SettingsTabs.tsx
│   ├── ui/                   # Shared UI
│   │   ├── SiteHeader.tsx
│   │   ├── SiteFooter.tsx
│   │   ├── AuthorMenu.tsx
│   │   ├── Modal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── Switch.tsx
│   │   ├── ToastProvider.tsx
│   │   └── icons.tsx
│   └── views/                # View rendering
│       ├── ViewRenderer.tsx
│       ├── ViewComponentRenderer.tsx
│       ├── EdgeMarker.tsx
│       ├── EditableViewTitle.tsx
│       ├── AuthorShortcuts.tsx
│       ├── useFocusNavigator.ts
│       ├── useInlineMenuEvents.ts
│       ├── useInlineMenuState.ts
│       └── DragScopeProvider.tsx
├── content/                  # Author mode source of truth
│   ├── nodes/{node_id}.json
│   ├── references/{ref_id}.json
│   ├── components/{Type}/{comp_id}.json
│   └── settings/
│       ├── home.json
│       ├── site.json
│       ├── menu/{menu_id}.json
│       ├── footer/{footer_id}.json
│       └── themes/
│           ├── config.json
│           └── custom/{theme_id}.json
├── lib/
│   ├── api/                  # API client
│   │   └── client.ts
│   ├── content/              # View + metadata resolution
│   │   ├── types.ts
│   │   ├── views.server.ts
│   │   ├── views.client.ts
│   │   ├── navigation.ts
│   │   ├── metadata.ts
│   │   ├── site.ts
│   │   ├── containers.ts
│   │   ├── themes.ts
│   │   └── markdown.ts
│   ├── store/                # (future state management)
│   └── utils/                # Utility functions
├── scripts/
│   ├── export-build.mjs      # Export /out to external repo
│   ├── add-build-timestamp.mjs
│   ├── publish-with-timestamp.mjs
│   ├── isolate-static.mjs
│   ├── smoke-author.mjs
│   ├── smoke-export.mjs
│   └── smoke-views.mjs
├── docs/
│   ├── implementation/
│   │   ├── implementation-plan.md
│   │   ├── status.md (this file)
│   │   ├── ux-plan.md
│   │   ├── view-layout.md
│   │   ├── drag-drop-strategy.md
│   │   ├── reference-strategy.md
│   │   ├── component-drag-scope-plan.md
│   │   └── modes-routing-build.md
│   └── diagrams/
│       └── (diagram outputs)
├── public/                   # Static assets
├── out/                      # Next.js export output (source)
├── .static-out/              # Isolated static build output
├── ENTITY_UML_SCHEMA.md      # Complete entity UML schema
├── OVERVIEW.md               # Architecture overview
├── TODO.md                   # Current TODO list
└── build-output.config.json  # External build output config
```

---

## Data Flow

### Author Mode (Development)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Author Mode (Development)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐         ┌──────────────┐                     │
│   │   Next.js    │◄───────►│ Flask Server │                     │
│   │  (port 4000) │  API    │ (port 4001)  │                     │
│   └──────────────┘         └──────┬───────┘                     │
│                                   │                              │
│                                   │ reads/writes                 │
│                                   ▼                              │
│                            ┌──────────────┐                     │
│                            │ content/     │                     │
│                            │ ├─ nodes/    │                     │
│                            │ ├─ references│                     │
│                            │ ├─ components│                     │
│                            │ └─ settings/ │                     │
│                            └──────────────┘                     │
│                                                                  │
│   metadata.json is NOT used during development                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Publish Mode (Production)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Publish Mode (Production)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Build Process:                                                 │
│   JSON files ──export──► metadata.json ──build──► Static HTML    │
│                                                                  │
│   Served:                                                        │
│   ┌──────────────┐                                              │
│   │ Static HTML  │  ◄── /out directory                          │
│   └──────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Resolution Flow (Runtime)

1. Load the root node by `node_id`
2. Load the reference via `ref_id`
3. Load the component (Container with `config.path`) via `comp_id`
4. For container components, walk the linked list via `child_node_id` and `next_node_id`
5. Merge component `config` with reference `overrides`
6. Recursively resolve children

---

## Key Implementation Details

### Inline Editing

- Text units use `contenteditable` for inline editing
- Blur event triggers save to backend
- Empty text units auto-remove on blur
- Press Enter in text unit adds DividerUnit + new PlainTextUnit

### Configuration Panel

- Floating panel at bottom of screen
- Shows settings for most recently focused component
- Toggle between compact (type + name) and detailed view
- Only visible in author mode

### AI Features

- Components have `useAI` toggle with optional `aiPrompt`
- References can also enable `useAI` for flexible AI placement
- AI features are UI-ready; backend integration pending

### Navigation in Menu/Footer

- Menu/footer items store `view_node_id` for internal references
- At runtime, label/href resolved from referenced view config
- Supports both internal views and external links

### Theme System

- `content/settings/themes/config.json` stores active theme
- `active_theme_id: null` = default theme
- `color_scheme: "system"` = auto detect dark/light mode
- Custom themes stored in `content/settings/themes/custom/{theme_id}.json`

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `PORT` | Next.js dev server port | Default: 4000 |
| `AUTHOR_PORT` | Flask author API port | Default: 4001 |
| `NEXT_PUBLIC_API_URL` | API URL for client | Default: `http://localhost:4001` |

---

## Testing Strategy

| Test Type | Status | Script |
|-----------|--------|--------|
| Smoke test (author) | ✅ Done | `npm run smoke:author` |
| Smoke test (export) | ✅ Done | `npm run smoke:export` |
| Smoke test (views) | ✅ Done | `npm run smoke:views` |
| Unit tests (backend) | ✅ Done | `npm run test:backend` |
| Storage adapter tests | ✅ Done | `npm run test` |
| API integration tests | ✅ Done | `npm run test` |
| E2E tests | ❌ Not started | - |

---

## Deployment

### Author Mode (Development)

```bash
npm run author
# Starts Next.js on port 4000 and Flask on port 4001
```

### Build for Production

```bash
npm run build
# Exports metadata.json, builds static output to .static-out/
```

### Publish with Timestamp

```bash
npm run publish:timestamp
# Adds timestamp, builds, exports to external repo, git pushes
```

### Preview Static Output

```bash
npm run preview
# Serves .static-out/ with serve package
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Static deploy cannot write | Author UI hidden in static mode; write paths guarded by mode check |
| Large datasets in JSON | JSON storage simple for now; SQLite/Postgres available if needed |
| Build-time data sync | Export step reads from local JSON; no remote DB dependency |
| SPA routing in static hosts | Next.js static export generates proper HTML structure |

---

## Summary

**What's Working:**
- ✅ Complete entity system with Node → Reference → Component resolution
- ✅ Full authoring experience with inline editing, drag and drop, configuration panels
- ✅ Flask API with comprehensive CRUD operations for all entities
- ✅ Static export pipeline generating fully static HTML
- ✅ Settings panels for navigation, views, site, media, AI, theme, styles
- ✅ Keyboard shortcuts and focus navigation
- ✅ Inline menus and context-aware UI
- ✅ SQLite and Postgres storage adapters (pluggable via DATA_DRIVER env)
- ✅ AI voice/tone settings panel
- ✅ View style defaults panel
- ✅ Theme management panel
- ✅ Backend unit and integration tests (34 tests)

**What's Pending:**
- ⏳ Cosmos adapter (not prioritized)
- ⏳ Remote file stores (S3/Azure/GCS) (not prioritized)
- ⏳ Search index (not prioritized)
- ⏳ E2E tests (smoke tests provide basic coverage)

**Next Steps:**
1. Consider Cosmos adapter if global availability is needed
2. Add E2E tests with Playwright/Cypress for comprehensive UI testing
3. Consider remote file stores for cloud deployment scenarios

---

## Related Documents

- `ENTITY_UML_SCHEMA.md` - Complete entity UML diagram
- `OVERVIEW.md` - Architecture overview and directory structure
- `docs/implementation/implementation-plan.md` - Original implementation plan
- `docs/implementation/ux-plan.md` - UX design decisions
- `docs/implementation/view-layout.md` - Visual layout model
- `docs/implementation/modes-routing-build.md` - Modes, routing, and build details
