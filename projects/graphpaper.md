---
title: graphpaper
summary: Framework-agnostic diagram renderer extracted from Mission Control: a neutral node/edge DiagramModel laid out with ELK and rendered as interactive SVG - status-colored nodes, orthogonal routing, hierarchy nesting, hover popovers, drill-down into nested sub-diagrams, lifecycle watermarks, and staged…
status: active
tags: [library, javascript, node-js, github-actions]
demo: https://github.com/scshafe/graphpaper
started: 2026-07
updated: 2026-07-28
order: 15
---

## What it is

Framework-agnostic diagram renderer extracted from Mission Control: a neutral node/edge DiagramModel laid out with ELK and rendered as interactive SVG - status-colored nodes, orthogonal routing, hierarchy nesting, hover popovers, drill-down into nested sub-diagrams, lifecycle watermarks, and staged step-through diagrams. No React required. Role: Director and design-doc author (substantially agent-built from two long human-authored design docs).

## Highlights

- Extracted a reusable zero-dependency library from a host application and released it as tagged v0.1.0 under MIT with a fully documented public API (hand-written 303-line index.d.ts).
- Release gate beyond npm test: verify runs the suite, audits the npm payload, packs the tarball, installs it into a fresh temporary consumer, and imports the public API - wired into prepublishOnly and pinned-SHA GitHub Actions.
- Nested scope drill-down modeled as a by-reference forest: an async resolveScope composes independently stored diagrams to unbounded depth.
- 53 tests including a DOM-safety source self-audit asserting the renderer has no innerHTML sink; strict additivity keeps existing models rendering byte-identical across feature waves.

## Skills

JavaScript, Node.js, GitHub Actions, Release Engineering, Graph Data Modeling, Test-Driven Development

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
