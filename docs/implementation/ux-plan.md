# UX Action Controls + Drag Handles Plan

## Goals
- Reduce long action rows by grouping controls into left/center/right areas.
- Make edit/delete buttons smaller and always right-aligned; edit uses yellow/orange.
- Move up/down controls sit on the far left as icon-only buttons.
- Enable drag-and-drop via an arrow-style drag handle button.

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
