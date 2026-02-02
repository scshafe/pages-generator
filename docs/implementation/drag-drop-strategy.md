# Drag-and-Drop Strategy for Abstracted Components

## Goal
Support drag-and-drop reordering and movement of **all Component-derived items** (except `ViewComponent`) within a tree whose structure is defined by Nodes and References. Dragging must work inside containers, across scopes, and in a way that respects the underlying linked-list ordering.

## Core Concepts

### 1) Structure vs. content
- **Node** defines placement in the tree.
- **Reference** ties node to a component instance.
- **Component** holds content/config.

Dragging moves **Nodes** (structure), not Components (content). This keeps content stable and preserves reuse/mirroring.

### 2) Ordering model
Sibling order is stored as a linked list:
- `previous_node_id`
- `next_node_id`

Containers point to the start of their child list via `child_node_id`.

Reordering is implemented as repeated swaps (move up/down) rather than rewriting order arrays. This keeps linked-list integrity and minimizes per-move complexity.

## Author Mode Dragging Flow

### Data payload
During drag:
```
{ nodeId, componentType }
```

This is enough to:
- Validate compatibility with target containers.
- Perform a reorder or reparent operation.

### Reorder within a container
1. Compute current index and target index within the active container’s child list.
2. If both nodes are in the same list:
   - Reorder locally for immediate UI feedback.
   - Persist by calling `/nodes/{id}/move` repeatedly until the node reaches the target.

### Reparent into a different container
1. If dragged node isn’t in the target container’s list:
2. Call `/nodes/{id}/reparent` with `target_parent_node_id` and (optionally) `before_node_id`.
3. Server updates parent/linked-list pointers.

## Drag Scope & Dynamic Structure

Because the structure is dynamic and nested, dragging relies on a **scope model**:

- **Active scope**: the sibling list currently being reordered.
- **Level down**: container nodes within the active scope.
- **Level up**: the parent container of the active scope.

### Scope shift interaction
- While dragging, eligible containers show purple outlines (level down) and a parent outline shows light blue (level up).
- Hovering an arrow for 2 seconds shifts the active scope:
  - Down: into that container’s children list.
  - Up: to the parent’s parent list.

This allows users to move a node into nested or parent containers without dropping early.

## Compatibility gating

When a drag enters a container, compatibility is checked by component type and container rules. Example:
- `Group` with `group_kind: list` and `listType: View` accepts only `LinkUnit`.

Incompatible drags are rejected with a user-facing toast.

## UI Structure

- Dragging is attached to the **component card** (not a handle).
- All component cards are draggable in author mode; the root view container is not a draggable item because it is the active scope root.
- Top-level view children use the same sortable list logic as nested containers.

## Files and code touchpoints
- UI + DnD behavior: `components/views/ViewComponentRenderer.tsx`
- Top-level sorting: `components/views/ViewRenderer.tsx`
- Scope state sharing: `components/views/DragScopeProvider.tsx`
- Backend move/reparent: `backend/server.py`
