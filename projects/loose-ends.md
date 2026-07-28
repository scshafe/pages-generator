---
title: Loose Ends
summary: CLI-first personal task manager: one Go binary acting as both command-line client and loopback (optionally tailnet-exposed) HTTP service, backed by Postgres, with hierarchical tasks, tags, and tree listing. Built end-to-end as a Mission Control agent-runtime trial across 8 planned phases plus a doc…
status: completed
tags: [go, postgresql, docker, tailscale]
repo: https://github.com/scshafe/loose-ends
started: 2026-06
updated: 2026-07-28
---

## What it is

CLI-first personal task manager: one Go binary acting as both command-line client and loopback (optionally tailnet-exposed) HTTP service, backed by Postgres, with hierarchical tasks, tags, and tree listing. Built end-to-end as a Mission Control agent-runtime trial across 8 planned phases plus a documented hardening pass. Role: Spec author and reviewer (entirely agent-built).

## Highlights

- Complete Go + Postgres task manager (~3,840 LOC, 21 test functions, 4 migration pairs) delivered through an 8-phase agent-runtime plan plus a post-trial hardening pass documented in HARDENING.md.
- Tailnet exposure via userspace tsnet: no /dev/net/tun, no CAP_NET_ADMIN, no privileged container, no tailscaled sidecar.
- Defense-in-depth network defaults: serve refuses a non-loopback bind unless an auth token is set or --allow-public is passed explicitly.
- Unit tests split from DSN-gated Postgres integration tests behind a build tag so the suite runs without a database.

## Skills

Go, PostgreSQL, Docker, Tailscale, Threat Modeling, Schema Design & Migrations, CLI Design

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
