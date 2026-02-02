# Reference Strategy

## Overview
The system separates **structure**, **presentation**, and **reusable content** by splitting content into three core entities:

- **Node**: defines placement in a tree and sibling order (linked list via `previous_node_id` / `next_node_id`).
- **Reference**: ties a Node to a Component and provides per-instance **overrides**.
- **Component**: holds the reusable content/config for a specific component type.

This design allows multiple Nodes to reference the same Component while applying different overrides, enabling reuse and “mirror” behavior without duplicating underlying content.

## Entity Relationships

```
Node (node_id)
  -> Reference (ref_id, node_id)
     -> Component (comp_id, type, config)
```

Key properties:
- **Node** stores placement and hierarchy.
- **Reference** stores `comp_id`, `overrides`, and optional `useAI` guidance.
- **Component** stores the canonical `config` for a component type, including optional `useAI` prompt fields.

## Why this layout works

1. **Reusable components**
   - Multiple Nodes can point to the same Component (`comp_id`).
   - A single component update is reflected across all references unless a reference overrides a field.

2. **Per-instance overrides**
   - Overrides are stored in Reference (`overrides` field).
   - Render-time config is composed with precedence: `merged = { ...component.config, ...reference.overrides }`.
   - This keeps the shared component clean while supporting per-instance customization.

3. **Stable IDs and consistent addressing**
   - Nodes, References, and Components each have stable IDs (`node_id`, `ref_id`, `comp_id`).
   - The UI and backend can always address a single instance (node) separately from the shared component.

4. **Clean tree traversal**
   - Containers hold `child_node_id` as the start of a linked list.
   - The tree is traversed by walking `next_node_id` to preserve order.
   - This keeps ordering independent from component content and supports efficient reordering.

## How references are resolved

1. Find the **Node** by `node_id`.
2. Resolve its **Reference** by `ref_id`.
3. Resolve its **Component** by `comp_id`.
4. Merge config: `component.config + reference.overrides`.
5. If the Component is a container, traverse its `child_node_id` list.

This flow is implemented on both the author API side and the static snapshot side.

## Mirroring behavior
“Mirror” creation makes a new Node + Reference that points to an existing Component. This preserves shared content while allowing per-node overrides.

Result:
- **Shared component**: one source of truth.
- **Distinct instances**: separate nodes/refs with their own overrides and placement.

## Runtime and build implications

- Author mode uses the API to read/update Nodes, References, and Components directly.
- Publish mode uses the exported metadata snapshot and resolves the exact same model locally.

## Navigation view references

Menu and footer items can store `view_node_id` to reference a view directly. At runtime, the navigation resolver maps that node to a Container with `config.path` and replaces label/href with the current view metadata.

## Social image border

Site settings include optional social image border fields (enabled, color, width, radius). During export, the build step generates a bordered version under `public/og/` and updates the snapshot to reference the bordered image.

## Files and code touchpoints
- Entity model: `ENTITY_UML_SCHEMA.md`
- View resolution: `lib/content/views.server.ts`
- API endpoints: `backend/server.py` (nodes / references / components)
- Metadata export: `backend/export_metadata.py`
