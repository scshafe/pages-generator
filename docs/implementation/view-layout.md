# View Layout and Component Hierarchy

This document describes the visual structure of a View, how Containers, Groups, and Units relate, and how view/group edge markers behave in author mode.

## Mental model

```
View (root node)
  -> Container (config.path = "/about")
     -> child list (linked list via child_node_id / next_node_id)
        -> Unit (leaf content)
        -> Group (layout + styling)
           -> child list (linked list)
              -> Unit (leaf content)
              -> ...
              -> Group edge markers (author-only)
        -> View edge markers (author-only)
```

Key idea: Containers define structure, Groups define layout, Units define content.

## Visual layout of a View

```
+----------------------------------------------------------+
| View: /about (Container)                                 |
| config.path = "/about"                                   |
|                                                          |
| View edge marker (start) >                               |
|                                                          |
| Children list (ordered):                                 |
|                                                          |
| 1) Inline block container (UI-only)                      |
|    +-- Unit: PlainTextUnit (inline editable)             |
|    +-- Unit: ImageMedia                                  |
|    +-- Unit: DividerUnit (ends block)                    |
|    +-- Inline block container (new block after Divider)  |
|        +-- Unit: PlainTextUnit                           |
|                                                          |
| 2) Group (style | inline | list)                         |
|    +-- Inline block container (UI-only)                  |
|        +-- Unit: PlainTextUnit                           |
|        +-- Unit: ImageMedia                              |
|        +-- Unit: DividerUnit                             |
|    +-- Inline block container (next block)               |
|                                                          |
| 3) Group (list)                                          |
|    +-- Unit: LinkUnit                                    |
|                                                          |
| 4) Inline block container (UI-only)                      |
|    +-- Unit: MarkdownUnit                                |
|                                                          |
| View edge marker (end) >                                 |
+----------------------------------------------------------+
```

## How Containers, Groups, and Units interact

### Container

- **Purpose:** structural grouping only.
- **Layout:** does not affect layout (`display: contents`).
- **Children:** holds the head of a linked list via `config.child_node_id`.
- **View identity:** a View is a Container with a `config.path`.
- **Default content:** new Views start empty and can add a Unit directly via the view edge marker.
- **Links:** when linking to a Container, the link resolves to its first child (Group or Unit) anchor.

### Group

- **Purpose:** layout and style wrapper for its children.
- **Layout kinds:** `group_kind` = `inline`, `style`, or `list`.
- **Default layout:** inline groups render child units as a series of inline spans.
- **Inline block container:** units are wrapped into blocks of inline content, separated by `DividerUnit` or scope changes.
- **Edge markers:** groups show start/end edge markers in author mode for adding text.
- **Optional config:** `listType`, `displayMode`, `isTransparent`, `name`.
- **Children:** holds the head of its own linked list via `config.child_node_id`.
- **Scope:** Groups define drag/drop scope and where inline composition happens.
- **Sub groups:** groups are always nested inside their parent scope (one level down).

### Unit

- **Purpose:** leaf content (text, code, media, etc.).
- **Placement:** Units can live inside a Group or directly under a View.
- **Inline block container:** Units are wrapped by a style-less inline block container at all scope levels (View or Group). This wrapper is UI-only and not stored.
- **Divider behavior:** `DividerUnit` is the shorthand for ending the current inline block container and starting a new one.
- **Text editing:** `PlainTextUnit` is inline editable. Enter inserts a `DividerUnit` and a new text unit. Empty text removes the unit.
- **Presentation:** text units render with a slightly darker background; code units use a dark theme with no padding.

## Edge markers

- **Where they appear:** at the start and end of each Group, and at the start/end of the View container, in author mode only.
- **Visual:** small dark-gray ">" markers that sit before and after the content.
- **Behavior:** clicking a marker creates a new PlainTextUnit inside the Group or View (start marker inserts at the beginning; end marker appends at the end) and focuses it.
- **Persistence:** markers are UI-only; they are not stored in content files.
- **Deduping:** when group borders touch (adjacent groups) only one marker is shown; empty groups show only the bottom marker. Views always show start/end markers, with a single marker when empty.

## Anchors and linking

- Group anchors: `group-<node_id>`
- Unit anchors: `unit-<node_id>`
- Container links resolve to the first child anchor to keep navigation stable even though Containers don't render layout.

## Ordering and insertion

- Children are ordered by a linked list (`child_node_id`, `next_node_id`).
- New items are appended unless explicitly inserted before a sibling.
- Start marker insertions prepend new content; end markers append to that Group or View child list.
