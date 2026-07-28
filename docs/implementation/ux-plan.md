# UX Action Controls + Drag Handles Plan

## Goals
- Reduce long action rows by grouping controls into left/center/right areas.
- Make edit/delete buttons smaller and always right-aligned; edit uses yellow/orange.
- Remove move up/down controls in favor of drag-and-drop.
- Enable drag-and-drop directly on component cards.

## Status

The current implementation uses icon-only edit/delete controls, card-based drag-and-drop, and a floating Configuration panel for the focused component. Text is edited inline with view/group edge markers and shortcut-driven add menus.

## Scope
- Component actions: `components/author/ComponentEditor.tsx`
- Component drag handles: `components/views/ViewComponentRenderer.tsx`
- View list actions + drag: `components/settings/ViewsPanel.tsx`
- Navigation item actions: `components/settings/EditableList.tsx`
- Media card actions: `components/settings/MediaPanel.tsx`
- Styling: `app/globals.css`

## Approach
1. Add action layout utilities in CSS: action bar + left/right groups.
2. Add button variants: small, icon-only, and edit (orange/yellow).
3. Replace move up/down text with icon-only buttons on the far left.
4. Add arrow drag handle buttons; move drag start events to the handle.
5. Re-layout actions so edit/delete are right-aligned and compact.

## Implementation Steps
1. Update `app/globals.css`:
   - Add `.action-bar`, `.action-group`, `.action-group--right`.
   - Add `.button.small`, `.button.icon`, `.button.edit`.
   - Add `.drag-handle` styles for the arrow drag handle button.
2. Update `components/views/ViewComponentRenderer.tsx`:
   - Replace the dot handle with a draggable arrow button.
   - Move drag start/end handlers to the handle.
3. Update `components/author/ComponentEditor.tsx`:
   - Move up/down to icon-only buttons on the left.
   - Move edit/delete to a right-aligned small-button group.
4. Update `components/settings/ViewsPanel.tsx`:
   - Add arrow drag handle to each view item.
   - Move up/down to icon-only buttons on the left.
   - Group edit/delete on the right with small-button styling.
   - Move other actions into a secondary row to reduce button density.
5. Update `components/settings/EditableList.tsx`:
   - Keep save on the left and move delete to the right, small.
6. Update `components/settings/MediaPanel.tsx`:
   - Keep copy on the left and move delete to the right, small.

## Validation
- In author mode, verify:
  - Components can be reordered by dragging the arrow button.
  - View list items can be reordered by dragging the arrow button.
  - Edit/delete are right-aligned and compact.
  - Move up/down are icon-only on the far left.
- Check layout at mobile widths to confirm action groups wrap cleanly.

## Strategy Summary
- **Reference strategy**: UX controls operate on Nodes/References, so edits apply to the correct instance while shared Components remain reusable. Overrides are stored on References and composed at render time.
- **Drag-and-drop strategy**: Reordering uses Node linked-list movement and scoped drag behavior, ensuring that abstracted Components can be moved without breaking reuse. The UI highlights scope boundaries and enables level-up/down transitions when dragging across containers.
- **Rich preview strategy**: Site metadata is edited in the Site tab and exported at build time; optional social image borders are generated and used for Open Graph previews.

## Implementation Look
- Author mode shows component headers (type + edit/delete) aligned in a dedicated header row.
- Containers show a single Add Component entry point that opens a modal using the same add-component interface.
- Dragging and reordering operate on structural Nodes while rendering merged Component + override config.
- Text units are edited in place; use shortcuts to open the add menus.
- Newly created views start empty and use view edge markers to add the first unit.
- View edge markers appear at the start and end of the view; groups have start/end markers for adding text.
- Empty text deletes the unit automatically.
- Press Enter in a text unit to insert a Divider and a new text unit.
- Hyper+G creates a sub group; Hyper+U opens the unit menu; Hyper+P inserts at the caret; Hyper+T toggles the configuration panel.
- The Configuration panel supports a compact mode that shows only the focused type and name.
- All configuration inputs live in the Configuration panel (no inline config controls on the canvas).
- A fixed Configuration panel at the bottom of the viewport shows the most recently focused component's settings.
- When components are shared, the Configuration panel shows a Reference section above the Original component settings.
- Configuration includes `useAI` toggles for the component and its reference, plus a prompt field when enabled.
