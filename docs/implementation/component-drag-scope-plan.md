# Component Dragging + Scope Shift Plan

## Goals
- All objects derived from `Component` are draggable, including content units and container components.
- `ViewComponent` is **not** draggable.
- Remove all up/down reorder buttons.
- Dragging is direct manipulation: click + drag the card itself.
- While dragging, show scope borders and arrow circles:
  - **Level down** (purple): containers in the current scope.
  - **Level up** (light blue): the parent container of the dragged node.
- Hovering an arrow glows it; after **2 seconds**, scope shifts and the user continues dragging.

## Scope Rules
- **Current scope** is the list of siblings in the container where the drag started.
- **Level down**: container nodes within the current scope are eligible targets.
- **Level up**: if the dragged node is a child, the **parent container edges** represent level up.

## Interaction Model
1. **Drag start**
   - User clicks and drags anywhere on the component card.
   - Cursor becomes `grab` on hover and `grabbing` during drag.
   - Drag is ignored if the click is on an input/button/link.

2. **Scope borders**
   - **Purple outlines** appear on *all container cards* in the current scope.
   - The **parent container** of the dragged node gets a **light blue outline**.
   - Each outline has a **circle intersecting the border** with an arrow:
     - Level down arrow points **into** the container.
     - Level up arrow points **out of** the container.

3. **Scope shift (hover + dwell)**
   - Hovering a scope arrow makes it **glow**.
   - After **2 seconds** of continuous hover, scope shifts:
     - **Level down** → scope becomes the hovered container’s children list.
     - **Level up** → scope becomes the parent container’s parent list.
   - Drag continues seamlessly; user can place the item in the new scope.

## Diagram (Intent)

```
Level Down (purple, arrow INTO container)
          ○→  (glows on hover; 2s = scope into children)
   ┌──────┼─────────────┐
   │      Container     │
   │   (drop into here) │
   └────────────────────┘

Level Up (light blue, arrow OUT of container)
          ←○  (glows on hover; 2s = scope to parent)
   ┌──────┼─────────────┐
   │     Parent         │
   │ (drag out to up)   │
   └────────────────────┘
```

## Implementation Design

### A) Drag scope state (shared)
Create a client-only drag scope context provider used by the view:
- `draggingId` / `draggingType`
- `activeScopeId` (container node id)
- `startDrag(nodeId, type, scopeId)`
- `endDrag()`
- `setActiveScopeId(id)`

### B) Make all components draggable
Update `SortableChildren` to make the **entire card** draggable:
- `draggable={enabled}` on `.draggable-item`
- `onDragStart` sets drag data and scope
- `onDragEnd` clears drag state
- Ignore drag start when target is interactive

### C) Scope border + arrow rendering
In the active scope list:
- Add purple outline to all container cards.
- Show level-down arrow circles on container nodes.

On the active scope parent container:
- Add light blue outline.
- Render a level-up arrow circle.

### D) Hover glow + 2s dwell
Arrow circles handle:
- `onDragEnter` → glow + start 2s timer
- `onDragLeave` → remove glow + cancel timer
- Timer completion → `setActiveScopeId(targetId)`

### E) Drop gating
Only the **active scope** accepts drop/reorder to reinforce scope shifts.

## Files to Update
- `components/views/DragScopeProvider.tsx` (new)
- `components/views/ViewComponentRenderer.tsx`
- `components/author/ComponentEditor.tsx`
- `components/settings/ViewsPanel.tsx`
- `components/views/ViewRenderer.tsx`
- `app/globals.css`

## Acceptance Checklist
- All Component-derived items (content + containers) are draggable; ViewComponent is not.
- No Move Up/Down buttons exist.
- Level down outlines are purple; level up outline is light blue.
- Arrow circles glow on hover and shift scope after 2 seconds.
- Dragging continues after scope shift; drop works in new scope.
