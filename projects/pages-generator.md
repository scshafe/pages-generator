---
title: Pages Generator
summary: A homegrown CMS and static-site generator — a Next.js authoring UI backed by a Flask JSON API that exports this site as fully static HTML for GitHub Pages.
status: active
tags: [next.js, react, flask, python, static-site, cms]
started: 2026-01
updated: 2026-07-28
featured: true
order: 10
---

## What it is

Pages Generator is the engine behind this site. It's a two-mode system: in
**Author Mode**, a Next.js app talks to a local Flask API for live, inline
editing — click any text to edit it, keyboard shortcuts add components, and a
floating configuration panel tunes the focused component. In **Publish Mode**,
the same app renders from a frozen JSON snapshot and exports a completely
static site that deploys to GitHub Pages for free — no server, no database,
no JavaScript required to read it.

## Why

Off-the-shelf static site generators separate writing from layout: you edit
markdown in one place and hope the theme does something reasonable with it.
This project explores the opposite: editing the site *in the site*, with the
exact production rendering, while still shipping plain static files.

## How it works

Content is a three-layer entity graph — `Node → Reference → Component` —
stored as individual JSON files. Nodes form the tree structure and sibling
order (a linked list via `next_node_id`), References attach a component with
per-use overrides, and Components hold the actual content and config. A page
("View") is just a Container component with a `path`, resolved recursively at
render time.

The build pipeline snapshots the entity graph into a single `metadata.json`,
pre-renders every view with Next.js static export, and pushes the output to a
separate deploy repository. Projects like this one are described in isolated
markdown files that the build discovers automatically — designed so multiple
coding agents can contribute entries in parallel without ever touching a
shared file.

## Status & learnings

Actively developed and running in production (you're reading its output).
Building a block editor from scratch is a rabbit hole — drag-and-drop scoping,
inline group markers, and edge cases around empty containers each earned
their own design doc. The linked-list sibling model keeps reordering cheap,
and separating References from Components makes reuse-with-overrides natural.
