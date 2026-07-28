# Entity UML Schema

This document defines the storage entity schema for the Views system using Mermaid.js class diagrams.

## Quick Reference

### Entity Hierarchy
```
Node ←──1:1──► Reference ──*:1──► Component
```

### ID Naming Convention
| Entity | Primary Key | Type | Storage |
|--------|-------------|------|---------|
| Node | `node_id` | NodeId | `nodes/{id}.json` |
| Reference | `ref_id` | RefId | `references/{id}.json` |
| Component | `comp_id` | CompId | `components/{Type}/{id}.json` |
| Menu | `menu_id` | MenuId | `settings/menu/{id}.json` |
| Footer | `footer_id` | FooterId | `settings/footer/{id}.json` |
| Theme | `theme_id` | ThemeId | `settings/themes/{id}.json` |
| Site | (singleton) | - | `settings/site.json` |

### Class Definition Styles
| Style | Color | Meaning |
|-------|-------|---------|
| `:::hasId` | Blue | Entity has its own table/directory |
| `:::isInstance` | Orange | Singleton instance (one file) |
| `:::noTable` | Green | Embedded object, stored inline |

### Relationship Notation
| Notation | Meaning | Implementation |
|----------|---------|----------------|
| `A *-- B` | **Composition** | A owns B; delete A = delete B |
| `A o-- B` | **Aggregation** | A references B; B exists independently |
| `A <\|-- B` | **Inheritance** | B extends A; requires `type` + `config` |

---

## Conceptual Model

A **View** is represented as:
- A **Node** (the root node for this view)
- Which has a **Reference**
- Which points to a **Container** with `config.path`
- The Container's children are accessed via `config.child_node_id`

```
┌─────────────────────────────────────────────────────────────┐
│  VIEW STRUCTURE (e.g., /about page)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Node (root)                                                 │
│  ├── node_id: 1001                                          │
│  ├── ref_id: 2001 ──────► Reference                         │
│  │                        ├── ref_id: 2001                  │
│  │                        ├── node_id: 1001                 │
│  │                        └── comp_id: 3001 ──► Container    │
│  │                                              ├── comp_id: 3001
│  │                                              ├── type: "Container"
│  │                                              ├── config.path: "/about"
│  │                                              ├── config.title: "About"
│  │                                              └── config.child_node_id: 1002
│  │                                                              │
│  └───────────────────────────────────────────────────────────────┘
│                                                                  │
│  Child linked-list (starts at Container.config.child_node_id):   │
│                                                                  │
│  Node (Title)                                                    │
│  ├── node_id: 1002                                               │
│  ├── ref_id: 2002                                                │
│  ├── parent_node: 1001                                           │
│  ├── previous_node: null                                         │
│  └── next_node: 1003 ──► Node (Markdown)                         │
│                          ├── node_id: 1003                       │
│                          ├── parent_node: 1001                   │
│                          ├── previous_node: 1002                 │
│                          └── next_node: null                     │
│                                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Class Diagram

```mermaid
classDiagram
    direction TB



    %% ============ CLASS DECLARATIONS ============

    class Node:::hasId
    class Reference:::hasId
    class Component:::hasId
    class Container
    class Group
    class UnitComponent
    class PlainTextUnit
    class DividerUnit
    class CodeUnit
    class CodeBlockUnit
    class AlertUnit
    class MarkdownUnit
    class LinkUnit
    class ButtonUnit
    class MediaUnit
    class ImageMedia
    class VideoMedia
    class PDFMedia
    class ExperienceComponent
    class HtmlComponent
    class JsComponent
    class BasicLink:::noTable
    class InternalLink
    class ExternalLink
    class Settings:::isInstance
    class Home:::isInstance
    class Site:::isInstance
    class Menu:::hasId
    class Footer:::hasId
    class Theme:::hasId

    %% ============ NODE ============

    Node : +created_at string
    Node : +updated_at string

    
    Node "1" *-- "1" Reference : ref_id
    Node "0..*" o-- "0..1" Node : parent_node
    Node "0..1" o-- "0..1" Node : previous_node
    Node "0..1" o-- "0..1" Node : next_node

    %% ============ REFERENCE ============

    Reference : +overrides Record?
    Reference : +useAI boolean?
    Reference : +created_at string
    Reference : +updated_at string

    Reference "1" o-- "1" Node : node_id
    Reference "0..*" o-- "1" Component : comp_id

    %% ============ COMPONENT (ABSTRACT) ============

    class Component {
        <<abstract>>
    }
    Component : +type ComponentType
    Component : +reference_count number
    Component : +useAI boolean?
    Component : +aiPrompt string?
    Component : +created_at string
    Component : +updated_at string

    Component <|-- Container
    Component <|-- Group
    Component <|-- UnitComponent
    Component <|-- ExperienceComponent
    Component <|-- HtmlComponent
    Component <|-- JsComponent

    %% ============ CONTAINER ============

    Container : +path string?
    Container : +name string?
    Container : +title string?
    Container : +browser_title string?
    Container : +description string?

    Container "1" o-- "0..1" Node : child_node_id

    %% ============ GROUP ============

    Group : +group_kind GroupKind
    Group : +listType ListItemType?
    Group : +displayMode DisplayMode?
    Group : +isTransparent bool?
    Group : +name string?

    Group "1" o-- "0..1" Node : child_node_id

    %% ============ UNIT COMPONENT (ABSTRACT) ============

    class UnitComponent {
        <<abstract>>
    }

    UnitComponent <|-- PlainTextUnit
    UnitComponent <|-- DividerUnit
    UnitComponent <|-- CodeUnit
    UnitComponent <|-- CodeBlockUnit
    UnitComponent <|-- AlertUnit
    UnitComponent <|-- MarkdownUnit
    UnitComponent <|-- LinkUnit
    UnitComponent <|-- ButtonUnit
    UnitComponent <|-- MediaUnit

    %% ============ PLAIN TEXT UNIT ============

    PlainTextUnit : +text string

    %% ============ DIVIDER UNIT ============

    DividerUnit : +config {}?

    %% ============ CODE UNIT ============

    CodeUnit : +code string

    %% ============ CODE BLOCK UNIT ============

    CodeBlockUnit : +code string

    %% ============ ALERT UNIT ============

    AlertUnit : +content string
    AlertUnit : +variant AlertVariant

    %% ============ MARKDOWN UNIT ============

    MarkdownUnit : +content string

    %% ============ LINK UNIT ============

    LinkUnit "1" *-- "1" BasicLink : basic_link

    %% ============ BUTTON UNIT ============

    ButtonUnit : +label string
    ButtonUnit : +url string

    %% ============ MEDIA UNIT (ABSTRACT) ============

    class MediaUnit {
        <<abstract>>
    }
    MediaUnit : +src InternalPath

    MediaUnit <|-- ImageMedia
    MediaUnit <|-- VideoMedia
    MediaUnit <|-- PDFMedia

    %% ============ IMAGE MEDIA ============

    ImageMedia : +alt string?

    %% ============ VIDEO MEDIA ============

    VideoMedia : +autoplay boolean?

    %% ============ PDF MEDIA ============

    PDFMedia : +title string?

    %% ============ EXPERIENCE COMPONENT ============

    ExperienceComponent : +position string
    ExperienceComponent : +company string
    ExperienceComponent : +start_date string
    ExperienceComponent : +end_date string
    ExperienceComponent : +image string
    ExperienceComponent : +content string

    %% ============ HTML COMPONENT ============

    class HtmlComponent {
        <<NOT IMPLEMENTING YET>>
    }

    %% ============ JS COMPONENT ============

    class JsComponent {
        <<NOT IMPLEMENTING YET>>
    }

    %% ============ BASIC LINK (ABSTRACT) ============

    class BasicLink {
        <<abstract>>
    }
    BasicLink : +label string
    BasicLink : +icon string?

    BasicLink <|-- InternalLink
    BasicLink <|-- ExternalLink

    %% ============ INTERNAL LINK ============

    InternalLink "1" o-- "1" Node : view_node_id
    InternalLink "1" o-- "0..1" Node : section_node_id

    %% ============ EXTERNAL LINK ============

    ExternalLink : +url string

    %% ============ HOME ============

    Home : +label string

    Home "1" o-- "0..1" InternalLink : root_link_id

    %% ============ SITE ============

    Site : +site_name string
    Site : +tagline string
    Site : +site_url string
    Site : +description string
    Site : +keywords string
    Site : +author string
    Site : +language string
    Site : +theme_color string
    Site : +twitter_handle string
    Site : +social_image_url string
    Site : +social_image_border_enabled boolean
    Site : +social_image_border_color string
    Site : +social_image_border_width number
    Site : +social_image_border_radius number
    Site : +robots string
    Site : +favicon_src string

    %% ============ MENU ============

    Menu : +position Position
    Menu : +order number

    Menu "0..1" o-- "0..1" InternalLink : internal_link_id

    %% ============ FOOTER ============

    Footer : +position Position
    Footer : +order number

    Footer "0..1" o-- "0..1" InternalLink : internal_link_id

    %% ============ THEME ============

    Theme : +name string
    Theme : +color_scheme ColorScheme

    %% ============ SETTINGS ============

    Settings "1" o-- "0..*" Theme : theme_ids
    Settings "1" o-- "0..1" Theme : active_theme_id
    Settings "1" o-- "0..*" Node : view_node_ids
    Settings "1" *-- "1" Home : home
    Settings "1" *-- "1" Site : site
    Settings "1" o-- "0..*" Menu : menu_ids
    Settings "1" o-- "0..*" Footer : footer_ids


    classDef hasId fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef isInstance fill:#fff3e0,stroke:#e65100,stroke-width:3px
    classDef noTable fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px
```

## Notes

### Inheritance Relationship (`A <|-- B`)

When class B inherits from abstract class A:

1. **Base class has `type` field** - Discriminator to identify derived type
2. **Derived class data in `config`** - All subclass-specific fields go in config object
3. **Storage by type** - Files stored in `{entity}/{Type}/{id}.json`

**Example:**
```json
{
  "comp_id": 12345,
  "type": "Container",
  "config": {
    "path": "/about",
    "title": "About Us"
  },
  "reference_count": 1
}
```

### Composition Relationship (`A *-- B`)

When A composes B (A owns B):

1. **A stores B's ID** - Foreign key field pointing to B
2. **Lifecycle coupling** - Deleting A should delete B
3. **B cannot exist without A** - B has no independent meaning

**Example:** `Node *-- Reference`
- Node owns its Reference
- Delete Node = delete its Reference
- Reference cannot exist without Node

### Aggregation Relationship (`A o-- B`)

When A aggregates B (A references B):

1. **A stores B's ID** - Foreign key field pointing to B
2. **Independent lifecycles** - B exists independently of A
3. **Reference only** - A just points to B, doesn't own it

**Example:** `Settings o-- Theme`
- Settings references Themes
- Themes exist independently
- Delete Settings ≠ delete Themes

## Type Definitions

### Path Types

| Type | Base Type | Description |
|------|-----------|-------------|
| `InternalPath` | `string` | Internal URL path (e.g., `/images/logo.png`) |
| `ExternalPath` | `string` | External URL (e.g., `https://example.com`) |
| `Path` | `InternalPath \| ExternalPath` | Union of internal or external paths |

### ID Types

All IDs are unsigned 32-bit integers generated randomly.

| Type | Base Type | Description |
|------|-----------|-------------|
| `UniqueId` | `unsigned integer` | Base type for all entity IDs |
| `NodeId` | `UniqueId` | Node entity identifier |
| `RefId` | `UniqueId` | Reference entity identifier |
| `CompId` | `UniqueId` | Component entity identifier |
| `ThemeId` | `UniqueId` | Theme identifier |
| `MenuId` | `UniqueId` | Menu entity identifier |
| `FooterId` | `UniqueId` | Footer entity identifier |

### Discriminator Types

```typescript
// Component type discriminator
type ComponentType =
  | 'Container' | 'Group'  // Containers
  | 'PlainTextUnit' | 'DividerUnit' | 'CodeUnit' | 'CodeBlockUnit' | 'AlertUnit' | 'MarkdownUnit' | 'LinkUnit' | 'ButtonUnit'  // Units
  | 'ImageMedia' | 'VideoMedia' | 'PDFMedia'  // Media
  | 'ExperienceComponent'  // Leaf
  | 'HtmlComponent' | 'JsComponent';  // Future

// Group kind discriminator
type GroupKind = 'list' | 'inline' | 'style';

// Link type discriminator
type LinkType = 'InternalLink' | 'ExternalLink';
```

### Other Types

```typescript
type ListItemType = 'View';

type DisplayMode = 'list' | 'grid' | 'cards';

type AlertVariant = 'info' | 'warning' | 'error' | 'success';

type ColorScheme = 'system' | 'light' | 'dark';

type Position = 'left' | 'right';

type AIConfig = {
  useAI?: boolean;
  aiPrompt?: string;
};
```

---

## Generating Diagrams

To generate an SVG diagram from this schema:

```bash
npm run generate:schema
```

This will create `docs/diagrams/entity-schema.svg`.
