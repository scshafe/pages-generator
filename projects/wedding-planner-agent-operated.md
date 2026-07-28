---
title: Wedding Planner (agent-operated)
summary: AI wedding-planner and guest-communication product built, maintained, and operated by autonomous Claude Code agents on a schedule, with humans holding only narrow reserved exceptions. Working offline core (telemetry, eval harness, self-improvement loop) plus a multi-tenant white-label product surfa…
status: completed
tags: [application, typescript, node-js, docker]
started: 2026-06
updated: 2026-07-28
order: 13
---

## What it is

AI wedding-planner and guest-communication product built, maintained, and operated by autonomous Claude Code agents on a schedule, with humans holding only narrow reserved exceptions. Working offline core (telemetry, eval harness, self-improvement loop) plus a multi-tenant white-label product surface bootable from Docker. Role: Goal-setter and safety-rail owner (built and operated by autonomous agents).

## Highlights

- 254 commits across 38 numbered autonomous build phases in eight days, every phase closing with an ADR (38 ADRs) and advancing only on green builds.
- ~37k LOC TypeScript with 998 test cases in 104 Vitest files across a six-package workspace.
- Multi-tenancy built as a security boundary: an unforgeable WeakSet-branded TenantContext derives the partition key, and unknown/suspended/onboarding tenants all render one byte-identical 404 so theming never becomes an existence oracle.
- Trusted-evidence architecture: the grader's inputs come from an out-of-band recorder and a hash-chained append-only ledger, so the self-improvement loop cannot grade itself.

## Skills

TypeScript, Node.js, Docker, Multi-Agent Orchestration, Threat Modeling, JSON Schema Contracts, Event-Sourced Architecture, Prompt Engineering, Test-Driven Development

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
