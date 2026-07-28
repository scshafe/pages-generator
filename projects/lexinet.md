---
title: Lexinet
summary: Idea-centric technical lexicon network where the root object is a concept, not a word: canonical names, acronyms, aliases, and localized names all resolve to one idea carrying definitions, examples, topics, and a typed relationship graph. One Go binary serves HTTP and a JSON-first CLI, with a nativ…
status: completed
tags: [application, go, postgresql, swift, swiftui, docker, tailscale]
repo: https://github.com/scshafe/lexinet
started: 2026-05
updated: 2026-07-28
order: 16
---

## What it is

Idea-centric technical lexicon network where the root object is a concept, not a word: canonical names, acronyms, aliases, and localized names all resolve to one idea carrying definitions, examples, topics, and a typed relationship graph. One Go binary serves HTTP and a JSON-first CLI, with a native macOS menu-bar lookup client. Role: Spec author and release gate (agent-built under Mission Control runtime).

## Highlights

- Modeled a lexicon as an idea graph: one concept resolves from UUID, UUID prefix, slug, or case-insensitive name, with acronym-as-entry links joining standalone acronym and expansion ideas.
- Configurable server-side search strategy with five pluggable matchers (exact, prefix, full-text, fuzzy-name, fuzzy-body), each with independent weight/threshold/priority and per-result matcher provenance.
- Native SwiftUI menu-bar client (~1,450 LOC incl. tests) degrading gracefully when the backend is down.
- 79 Go test functions across storage, search, CLI, HTTP compatibility, and config, with embedded migrations.

## Skills

Go, PostgreSQL, Swift, SwiftUI, Docker, Tailscale, Fuzzy Search & Ranking, Graph Data Modeling, Schema Design & Migrations, CLI Design

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
