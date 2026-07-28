---
title: fzfind
summary: Dependency-free Go CLI and thin HTTP server for fuzzy file-name search and in-document content search, with a composable required/optional regex query engine, layered configuration, a stable JSON output contract, and remote search over Tailscale hosts via SSH.
status: completed
tags: [tool, go, tailscale]
repo: https://github.com/scshafe/fzfind
started: 2026-05
updated: 2026-07-28
order: 12
---

## What it is

Dependency-free Go CLI and thin HTTP server for fuzzy file-name search and in-document content search, with a composable required/optional regex query engine, layered configuration, a stable JSON output contract, and remote search over Tailscale hosts via SSH. Role: Sole author.

## Highlights

- 8-phase build executed to completion in 10 commits with go test green at each phase boundary (~3.4k LOC across 8 packages, a test file per package).
- Query engine composing a REQUIRED regex with weighted OPTIONAL clauses under boost/any/all modes, scoped per-clause to name/content/both - the deliberate central design decision.
- --json treated as a stable contract for a future GUI: documented shape with matches, skips with reasons, non-fatal errors, and remote source tags so local and remote hits merge cleanly.
- --dry-run renders the exact SSH argv for operator review before any connection is made.

## Skills

Go, Tailscale, Fuzzy Search & Ranking, CLI Design

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
