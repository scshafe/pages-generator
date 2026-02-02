# Blog App Overview

A Next.js static site with a configurable Views system. It runs in **Author Mode** for local editing via a Flask/JSON API and **Publish Mode** for fully static deployment.

## Architecture

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

## Entity Architecture

The system uses a three-layer entity architecture for content management:

```
Node → ref_id → Reference → comp_id → Component
```

**Views are Container components** — a View is represented as a Node pointing to a Reference pointing to a Container with `config.path`.

### Resolution Flow

When displaying a view, the system resolves entities in this order:

1. Load the root node by `node_id`
2. Load the reference via `ref_id`
3. Load the component (Container with `config.path`) via `comp_id`
4. For container components, walk the linked list via `child_node_id` and `next_node_id`
5. Merge component `config` with reference `overrides`
6. Recursively resolve children

See `ENTITY_UML_SCHEMA.md` for the full UML diagram.
See `docs/implementation/view-layout.md` for the visual layout model and how Containers, Groups, Units, and group markers interact.

## Authoring UX (Author Mode)

- Click any text unit to edit inline.
- Use shortcuts to add content (Hyper+G creates a sub group; Hyper+U/P opens the unit menu).
- Views show edge markers at start/end; when empty, a single marker adds the first unit.
- View titles are inline editable in author mode.
- Text is editable in place; clearing all text removes that unit automatically.
- Press Enter in a text unit to add a Dividor and a new text unit.
- The Configuration panel can be toggled into a compact view that shows only type and name.
- Configuration inputs are only in the Configuration panel (the canvas has no config controls).
- The floating Configuration panel at the bottom shows editable settings for the most recently focused component.
- Components support a `useAI` toggle with an optional prompt; references can also enable `useAI` for flexible placement.

## Directory Structure

```
├── app/                      # Next.js App Router pages
│   ├── [[...viewPath]]/      # Dynamic catch-all route for views
│   └── settings/             # Author-only settings page
├── backend/                  # Flask API server
│   ├── server.py             # API endpoints
│   ├── database.py           # JSON storage helpers
│   ├── export_metadata.py    # Exports metadata.json snapshot
│   └── reset_data.py         # Reset and seed data
├── components/
│   ├── author/               # Author-only UI (edit/add components)
│   ├── settings/             # Settings panels
│   ├── ui/                   # Shared UI (header/footer/modals)
│   └── views/                # View rendering + drag/drop
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
│   └── content/              # View + metadata resolution
├── scripts/
│   ├── export-build.mjs       # Export /out to external repo
│   ├── add-build-timestamp.mjs # Insert build timestamp into home view
│   ├── publish-with-timestamp.mjs # Timestamp + build + export + git push
│   └── smoke-*.mjs            # Smoke tests
├── docs/                     # Documentation
├── public/                   # Static assets
├── build-output.config.json  # External build output config
├── next.config.mjs
├── out/                      # Next.js export output (source)
└── .static-out/              # Isolated static build output
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
| Site | `content/settings/site.json` | (singleton) | Site metadata + favicon |
| Menu | `content/settings/menu/{menu_id}.json` | `menu_id` | Header items (may include `view_node_id`) |
| Footer | `content/settings/footer/{footer_id}.json` | `footer_id` | Footer items (may include `view_node_id`) |
| Themes | `content/settings/themes/custom/{theme_id}.json` | `theme_id` | Custom theme definitions |

**View references in navigation**
- Menu/Footer items can store `view_node_id` for internal view references.
- At runtime, the label/href are resolved from the referenced view config.

**metadata.json**
- Generated at build time only and used for publish mode runtime.

## Build and Export

1. `npm run build` runs `backend.export_metadata` then `next build` to generate `out/`, then copies it to `.static-out/`.
2. `npm run build:export` copies `out/` into an external repo directory configured in `build-output.config.json`.
3. The export script preserves the destination `.git` directory and prevents copying into the app repo.
