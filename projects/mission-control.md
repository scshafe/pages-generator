---
title: Mission Control
summary: Local-first, single-operator console that is the durable home for every project: status, implementation plans, architecture graphs, notes, chats, approvals, execution evidence, and deployments. Composes separately versioned orchestration kernels (pipeline, execution abstraction, swarm/authority, CI…
status: active
tags: [application, typescript, node-js, postgresql, react, redux-toolkit, docker, tailscale]
demo: https://github.com/scshafe/mission-control
started: 2026-05
updated: 2026-07-28
order: 20
---

## What it is

Local-first, single-operator console that is the durable home for every project: status, implementation plans, architecture graphs, notes, chats, approvals, execution evidence, and deployments. Composes separately versioned orchestration kernels (pipeline, execution abstraction, swarm/authority, CI-CD, diagram) through explicit adapters. Role: Architect, operator, and release gate (human-directed, substantially agent-built).

## Highlights

- 1,117 commits in ~11 weeks across an 8-package npm workspace with an enforced L0-L3 dependency DAG and per-package ownership statements.
- 107 PostgreSQL migrations defining ~83 tables, plus a staged SQLite-to-Postgres cutover whose /healthz exposes machine-readable cutoverReadiness and fails closed.
- 3,246 test cases across 306 node:test files, CI-gated against a pinned PostgreSQL 18.4 container.
- React 19 + Redux Toolkit operator console (13 component domains, ~30 state managers) under a hard no-useState rule and a two-way CLI-web parity contract.
- Ships reusable infrastructure of its own: an error-reporting SDK other codebases import, a rollback-safe deploy kernel, and CI/CD host integration with drift watches.

## Built with

- [graphpaper](/projects/graphpaper/)
- [conductor](/projects/conductor/)
- [mc-ui](/projects/mc-ui/)
- [mission-eal](/projects/mission-eal/)
- [mission-pipeline](/projects/mission-pipeline/)
- [mission-swarm](/projects/mission-swarm/)

## Skills

TypeScript, Node.js, PostgreSQL, React, Redux Toolkit, Docker, Tailscale, GitHub Actions, Multi-Agent Orchestration, Event-Sourced Architecture, Schema Design & Migrations, Release Engineering, Test-Driven Development

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
