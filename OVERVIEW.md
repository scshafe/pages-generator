# Project Overview

A Next.js static blog with a configurable Views system. Features **Author Mode** for local content editing via Flask/JSON and **Publish Mode** for generating static HTML for deployment.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Author Mode (Development)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐         ┌──────────────┐                     │
│   │   Next.js    │◄───────►│ Flask Server │                     │
│   │  (port 3000) │  API    │ (port 3001)  │                     │
│   └──────────────┘         └──────┬───────┘                     │
│                                   │                              │
│                                   │ reads/writes                 │
│                                   ▼                              │
│                            ┌──────────────┐                     │
│                            │ content/     │                     │
│                            │ ├─ views/    │                     │
│                            │ ├─ nodes/    │                     │
│                            │ ├─ refs/     │                     │
│                            │ ├─ comps/    │                     │
│                            │ └─ settings/ │                     │
│                            └──────────────┘                     │
│                                                                  │
│   metadata.json is NOT used during development                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Publish Mode (Production)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Build Process:                                                 │
│   JSON files ──export──► metadata.json ──build──► Static HTML   │
│                                                                  │
│   Served:                                                        │
│   ┌──────────────┐                                              │
│   │ Static HTML  │  ◄── /out directory                          │
│   └──────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Entity Architecture

The system uses a three-layer entity architecture for content management:

```
Node → ref_id → Reference → comp_id → Component
```

**Views are now ViewContainer components** - a View is represented as a Node pointing to a Reference pointing to a ViewContainer component.

### Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIPS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   NODE (tree structure position)                                 │
│   ├─ node_id [PK]                                               │
│   ├─ ref_id ─────────────────────────────┐                      │
│   ├─ parent_node_id (null for root)      │                      │
│   ├─ previous_node_id (sibling chain)    │                      │
│   └─ next_node_id (sibling chain)        │                      │
│                                          │                      │
│   REFERENCE (indirection layer)          │                      │
│   ├─ ref_id [PK] ◄───────────────────────┘                      │
│   ├─ node_id (back-reference)                                   │
│   ├─ comp_id ────────────────────────────┐                      │
│   └─ overrides (location-specific config)│                      │
│                                          │                      │
│   COMPONENT (content/config)             │                      │
│   ├─ comp_id [PK] ◄──────────────────────┘                      │
│   ├─ type (discriminator)                                       │
│   ├─ config (type-specific data)                                │
│   └─ reference_count (for deletion safety)                      │
│                                                                  │
│   CONTAINER extends COMPONENT                                    │
│   └─ child_node_id (first child in linked-list)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Resolution Flow

When displaying a view, the system "resolves" entities:

1. Load root node by `node_id`
2. Load reference via `ref_id`
3. Load component (ViewContainer) via `comp_id`
4. For container components, get `child_node_id` and walk the linked-list via `next_node_id`
5. Merge component `config` with reference `overrides`
6. Recursively resolve children

See `docs/ENTITY_UML_SCHEMA.md` for the complete UML diagram and `docs/ID_NAMING_CONVENTIONS.md` for ID field naming rules.

## Directory Structure

```
├── app/                      # Next.js App Router pages
│   ├── [[...viewPath]]/      # Dynamic catch-all route for views
│   ├── posts/[slug]/         # Individual blog post pages
│   └── settings/             # Author-only settings page
├── components/               # React components
│   ├── views/                # View system components
│   │   ├── ViewRenderer.tsx
│   │   ├── ViewComponentRenderer.tsx
│   │   ├── ViewPageClient.tsx
│   │   └── [Type]Component.tsx
│   ├── posts/                # Blog post components
│   ├── settings/             # Settings page UI components
│   ├── ui/                   # Shared UI (Header, Footer, ThemeProvider)
│   └── author/               # Author mode components
├── backend/                  # Python Flask server
│   ├── server.py             # Main API server with logging middleware
│   ├── database.py           # JSON file-based database module
│   ├── entities/             # Python entity classes
│   │   ├── __init__.py       # Export all entities
│   │   ├── base.py           # Entity base class, generate_id()
│   │   ├── node.py           # Node class
│   │   ├── reference.py      # Reference class
│   │   ├── component.py      # Component base classes
│   │   ├── containers.py     # ViewContainer, ListContainer, etc.
│   │   ├── units.py          # SectionUnit, MarkdownUnit, etc.
│   │   ├── media.py          # ImageMedia, VideoMedia, PDFMedia
│   │   ├── settings.py       # Settings entities
│   │   └── links.py          # BasicLink, InternalLink, ExternalLink
│   ├── routes/               # Blueprint route handlers
│   │   ├── nodes.py          # Node CRUD + tree operations
│   │   ├── references.py     # Reference CRUD
│   │   ├── components.py     # Component CRUD
│   │   ├── home.py           # Home button configuration
│   │   ├── navigation.py     # Header/footer navigation
│   │   ├── themes.py         # Theme management
│   │   ├── posts.py          # Blog post operations
│   │   ├── media.py          # Image/PDF handling
│   │   ├── metadata.py       # Full metadata operations
│   │   └── debug.py          # Debug endpoints
│   ├── export_metadata.py    # Exports JSON to metadata.json
│   └── reset_and_seed.py     # Reset data to seed state
├── content/                  # Source of truth during development
│   ├── nodes/{node_id}.json  # Tree structure nodes
│   ├── references/{ref_id}.json  # References with overrides
│   ├── components/           # Component content/config
│   │   ├── ViewContainer/{comp_id}.json
│   │   ├── ListContainer/{comp_id}.json
│   │   ├── SectionUnit/{comp_id}.json
│   │   ├── MarkdownUnit/{comp_id}.json
│   │   ├── AlertUnit/{comp_id}.json
│   │   ├── PlainTextUnit/{comp_id}.json
│   │   ├── LinkUnit/{comp_id}.json
│   │   ├── ImageMedia/{comp_id}.json
│   │   ├── VideoMedia/{comp_id}.json
│   │   ├── PDFMedia/{comp_id}.json
│   │   ├── ExperienceComponent/{comp_id}.json
│   ├── settings/             # Split settings structure
│   │   ├── home.json         # Home button label, root view
│   │   ├── menu/{menu_id}.json  # Header menu items (right side)
│   │   ├── footer/{footer_id}.json   # Footer navigation items
│   │   └── themes/
│   │       ├── config.json   # Active theme, color scheme
│   │       └── custom/{theme_id}.json # Custom theme definitions
│   ├── posts/*.md            # Blog post markdown files
│   └── metadata.json         # Generated at build time only
├── lib/
│   ├── api/
│   │   └── client.ts         # Centralized API client with logging
│   ├── content/
│   │   ├── components.ts     # Component type definitions (renamed from views.ts)
│   │   ├── types.ts          # Shared TypeScript types with branded IDs
│   │   ├── views.server.ts   # Server-side view loading
│   │   ├── posts.ts          # Post loading utilities
│   │   ├── navigation.ts     # Navigation config loading
│   │   ├── themes.ts         # Theme definitions
│   │   └── themes.server.ts  # Server-side theme loading
│   ├── store/                # Redux Toolkit store
│   │   ├── index.ts          # Store configuration
│   │   ├── hooks.ts          # Typed hooks
│   │   ├── StoreProvider.tsx # Redux provider wrapper
│   │   └── slices/
│   │       ├── authorSlice.ts
│   │       ├── viewSlice.ts
│   │       ├── themeSlice.ts
│   │       └── navigationSlice.ts
│   └── utils/
│       ├── index.ts          # Utility exports
│       ├── logging.ts        # Verbose logging utilities
│       └── fuzzyMatch.ts     # Fuzzy matching for search
├── scripts/
│   ├── generate-feed.mjs     # RSS feed generation
│   └── postbuild.mjs         # Post-build processing
├── docs/                     # Documentation
│   ├── ENTITY_UML_SCHEMA.md  # UML class diagram
│   ├── ID_NAMING_CONVENTIONS.md  # ID field naming rules
│   └── DATA_PERSISTENCE.md   # Data flow documentation
├── public/                   # Static assets
├── site.config.ts            # Site configuration (output directory)
└── out/                      # Static build output
```

## Data Flow

### Source of Truth

During development, data is stored in individual JSON files:

| Entity | Location | Primary Key | Purpose |
|--------|----------|-------------|---------|
| Nodes | `content/nodes/{node_id}.json` | `node_id` | Tree structure and sibling ordering |
| References | `content/references/{ref_id}.json` | `ref_id` | Component references with overrides |
| Components | `content/components/{Type}/{comp_id}.json` | `comp_id` | Component content and config |
| Home | `content/settings/home.json` | (singleton) | Home button label, root view |
| Menu | `content/settings/menu/{menu_id}.json` | `menu_id` | Header menu items (right side) |
| Footer | `content/settings/footer/{footer_id}.json` | `footer_id` | Footer navigation items |
| Themes | `content/settings/themes/custom/{theme_id}.json` | `theme_id` | Custom theme definitions |
| Posts | `content/posts/*.md` | (slug) | Blog post markdown |

**Views are ViewContainer components** - no separate views directory.

**Home button** is configured via `content/settings/home.json` and appears in the top-left, separate from the right-side Menu. It always links to `/`, and the root view must be set to an existing view.

**metadata.json** is ONLY generated at build time, never read/written during development.

## Default State

- No user-created views, Menu items, or Footer items exist at startup.
- The root view defaults to a built-in "No Page Found" view until a real view is created and set as root.
- Author mode always shows a Settings button (gear icon) that links to `/settings`; it is the only default navigation item.
- Themes should start from a gentle, low-contrast color palette.

## Authoring UX

- Views can only be created from the Settings page (accessible via the gear button URL shown only in Author Mode).
- Settings are organized into tabs by type.
- The Views tab shows the current list of views (empty at startup) and a "Create new view" button.
- Clicking "Create new view" creates a view and immediately allows editing.
- In Author Mode, any UI value derived from settings is editable or deletable by clicking the displayed value.
- When a value is modified, a Save button appears for that item.
- Updates only apply after clicking Save.
- Views render top-to-bottom as a linear component sequence; List containers may render as grid or columns.
- Containers display an "Add component" affordance after their current children.
- Clicking "Add component" shows the next-level derived class options; this selection flow is recursive for multi-level inheritance.
- "No Page Found" is a built-in view.

### ID Generation

All entity IDs are random 32-bit unsigned integers:
- `generate_id()` returns `random.randint(0, 0xFFFFFFFF)`
- IDs are immutable and not user-editable
- Ensures no conflicts even with concurrent operations

See `docs/ID_NAMING_CONVENTIONS.md` for ID field naming rules.

## API Endpoints

All endpoints use prefixed ID field names (`node_id`, `ref_id`, `comp_id`, etc.). See `docs/ID_NAMING_CONVENTIONS.md`.

### Core Entity APIs

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/nodes` | GET, POST | Nodes CRUD |
| `/nodes/<node_id>` | GET, PUT, DELETE | Individual node |
| `/nodes/<node_id>/move` | PUT | Reposition node in tree |
| `/nodes/<node_id>/children` | POST | Add child to node |
| `/nodes/<node_id>/resolved` | GET | Node with resolved component tree |
| `/references` | GET, POST | References CRUD |
| `/references/<ref_id>` | GET, PUT, DELETE | Individual reference |
| `/components` | GET | List all components |
| `/components/<type>` | GET, POST | Components by type |
| `/components/<type>/<comp_id>` | GET, PUT, DELETE | Individual component |
| `/components/<type>/<comp_id>/usages` | GET | Find all usages of component |

### Settings APIs

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/home` | GET, PUT | Home button configuration |
| `/home/root-view` | GET, PUT | Root view for `/` (returns `node_id`) |
| `/navigation` | GET, PUT | Navigation (aggregated) |
| `/menu` | GET, POST | Menu items |
| `/menu/<menu_id>` | PUT, DELETE | Individual menu item |
| `/footer` | GET, POST | Footer items |
| `/footer/<footer_id>` | PUT, DELETE | Individual footer item |
| `/themes` | GET, PUT | Theme configuration |
| `/themes/<theme_id>` | GET, PUT, DELETE | Individual theme |

### Content APIs

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/posts` | GET | Posts listing |
| `/post` | POST | Create post |
| `/post/<slug>` | PUT, DELETE | Individual post |

### Utility APIs

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/metadata` | GET, PUT | Full metadata |
| `/fetch-image` | POST | Fetch image from URL |
| `/save-image` | POST | Save image to public |
| `/upload-pdf` | POST | Upload PDF file |
| `/health` | GET | Health check |
| `/raw/<entity_type>` | GET | Debug: raw entity data |

## Logging

### Backend (Flask)

The server uses a custom VERBOSE logging level (15, between DEBUG and INFO):

```python
# Color-coded request/response logging
→ GET /views                           # Cyan
→ POST /views/123/components           # Green
→ PUT /references/456                  # Yellow
→ DELETE /nodes/789                    # Red
← 200 GET /views (views=3)             # Green status
← 404 DELETE /views/123 error="..."    # Red status

# Verbose mode shows full JSON payloads
──────────────────────────────────────
URL Params:
{"path_params": {"id": 123}}
JSON Data:
{"component_type": "Title", "config": {...}}
──────────────────────────────────────
```

### Frontend (React)

The API client (`lib/api/client.ts`) logs all requests:

```javascript
→ GET /views/123/resolved              // Cyan
→ POST /nodes/456/children {...}       // Green (truncated body)
← 200 GET /views/123/resolved (1.2ms) (components=5)
← 404 DELETE /nodes/789 (error="Node not found")
```

## Component Types

Components are organized into a hierarchy based on the UML schema in `docs/ENTITY_UML_SCHEMA.md`.

### Component Hierarchy

```
Component (abstract)
├── Container (abstract) - has child_node_id
│   ├── ViewContainer - represents a page/view
│   ├── ListContainer - container for list items
│   ├── InlineContainer - inline content wrapper
│   └── StyleContainer - styling wrapper
├── UnitComponent (abstract) - leaf content
│   ├── SectionUnit - heading/title (formerly Title)
│   ├── PlainTextUnit - plain text (formerly Information)
│   ├── AlertUnit - alert boxes (formerly Alert)
│   ├── MarkdownUnit - markdown content (formerly MarkdownEditor)
│   ├── LinkUnit - link display
│   └── MediaUnit (abstract)
│       ├── ImageMedia - images (formerly MultiMedia)
│       ├── VideoMedia - videos
│       └── PDFMedia - PDFs (formerly PDFViewer)
├── ExperienceComponent - work experience
```

### Component Type Reference

| Type | Description | Container | Old Name |
|------|-------------|-----------|----------|
| ViewContainer | Page/view with path and metadata | Yes | (View entity) |
| ListContainer | Container for child items | Yes | List |
| InlineContainer | Inline content wrapper | Yes | (new) |
| StyleContainer | Styling wrapper | Yes | (new) |
| SectionUnit | Section heading | No | Title |
| PlainTextUnit | Plain text content | No | Information |
| AlertUnit | Warning/info alert boxes | No | Alert |
| MarkdownUnit | Editable markdown content | No | MarkdownEditor |
| LinkUnit | Link display | No | ViewLink |
| ImageMedia | Image display | No | MultiMedia |
| VideoMedia | Video display | No | (new) |
| PDFMedia | Embedded PDF display | No | PDFViewer |
| ExperienceComponent | Work experience card | No | Experience |

## State Management

Frontend uses Redux Toolkit:

- **authorSlice**: Author mode toggle, editing state
- **viewSlice**: Current view, components, CRUD operations via async thunks
- **themeSlice**: Active theme, color scheme preference
- **navigationSlice**: Site name, header/footer nav items

Key viewSlice async thunks:
- `fetchCurrentView(viewId)` - Load resolved view
- `addComponentToCurrentView({viewId, component_type, config})` - Add component
- `addChildToListComponent({viewId, parent_node_id, component_type, config})` - Add list child
- `updateComponentConfig({viewId, component_id, ref_id, config, useOverrides})` - Update component
- `deleteComponentFromView({viewId, node_id})` - Delete component
- `moveComponentInView({viewId, node_id, direction})` - Reorder component

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server only (read-only) |
| `npm run author` | Start both Next.js and Flask servers |
| `npm run author:server` | Start Flask server only |
| `npm run build` | Build static site (exports metadata first) |
| `npm run preview` | Preview built static site |
| `npm run export:metadata` | Export JSON to metadata.json |
| `npm run data:reset` | Reset all data to default |
| `npm run data:reset-data` | Reset only view data |
| `npm run data:reset-settings` | Reset only settings |
| `npm run data:reset-interactive` | Interactive reset |
| `npm run lint` | Run ESLint |

## Reserved Paths

These paths cannot be used for views:
- `/` - Alias for default home view
- `/settings` - Settings page
- `/posts/[slug]` - Individual blog posts
- `/feed.xml` - RSS feed
- `/api` - Reserved for future API routes

## Key Configuration

- `.env.development`: Sets `NEXT_PUBLIC_BUILD_MODE=author`
- `.env.production`: Sets `NEXT_PUBLIC_BUILD_MODE=publish`
- `next.config.ts`: Static export with `output: 'export'`
- `site.config.ts`: Output directory configuration

## Prerequisites

- Node.js 18+
- Python 3.8+
- pip packages: `flask`, `flask-cors`, `requests`, `pyyaml`

```bash
pip install flask flask-cors requests pyyaml
npm install
```
