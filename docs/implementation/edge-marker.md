# Edge Marker Behavior

## Overview
Edge markers are inline insertion controls used in Author Mode for views and groups. They sit between units/groups and at the end of a scope to allow quick focus, insertion, and keyboard-driven commands without leaving the flow of the content.

## Placement
- Inserted before every child in `SortableChildren` (between items) and once at the end of the scope.
- Rendered for both view and group scopes in Author Mode.
- Blank scopes (no children) render a single edge marker with a `>` glyph as a placeholder.

## Visual Spec
- Thin vertical rectangle, 10px wide and 25px tall.
- Divided into three stacked rectangular segments:
  - Top: 8px tall
  - Middle: fills remaining height
  - Bottom: 8px tall
- Segments are solid black rectangles by default and turn bright orange on hover.
- Hovering the edge marker group also turns the group background bright orange.
- Blank-line markers show `>` and do not render the segmented control.

## Interaction
- Top segment click: focus the end of the immediately previous text-editable unit (if present).
- Middle segment click: focus the edge marker itself.
- Bottom segment click: focus the start of the immediately next text-editable unit (if present).

## Typing & Insertions
- When the edge marker is focused, typing creates a new `PlainTextUnit` at the marker location and focuses it for inline editing.
- Pressing Enter on a focused edge marker inserts a new empty `PlainTextUnit` at the marker location.

## Author Commands
- Unit menu commands (`author-menu-open` with menu type `unit`) fired while an edge marker is focused:
  - Insert a new `PlainTextUnit` at the marker location.
  - Re-dispatch the menu open event for the new unit so the menu targets that unit.
- Group creation commands (`author-group-create`) fired while an edge marker is focused:
  - Insert a new `Group` at the marker location.
  - Insert a `PlainTextUnit` as the first child and focus it.

## Data Attributes
- Each edge marker button includes:
  - `data-edge-marker` ("between" or "end")
  - `data-parent-id` (scope node id)
  - `data-node-id` (scope node id)
  - `data-before-node-id` (next sibling id for insertion)
  - `data-component-type` ("ViewMarker" or "GroupMarker")

## Key Files
- `blogcomponents/views/EdgeMarker.tsx`
- `blogcomponents/views/ViewComponentRenderer.tsx`
- `blogcomponents/views/AuthorShortcuts.tsx`
- `app/globals.css`
