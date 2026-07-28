---
title: Bellwether
summary: Paper-money agent trading platform: a strategy/risk/execution agent team combining a quantitative playbook with LLM-driven qualitative judgment, co-developing strategies with a human and exposing results through a read-only family portal. Paper only - the live-broker path is designed but explicitly…
status: completed
tags: [typescript, node-js, react, redux-toolkit, postgresql, docker, tailscale]
repo: https://github.com/scshafe/bellwether
started: 2026-06
updated: 2026-07-28
---

## What it is

Paper-money agent trading platform: a strategy/risk/execution agent team combining a quantitative playbook with LLM-driven qualitative judgment, co-developing strategies with a human and exposing results through a read-only family portal. Paper only - the live-broker path is designed but explicitly disabled. Role: Primary author (agent-assisted in places).

## Highlights

- Full agent-team trading loop in 41 commits over ~2 days: quant playbook guardrails, an Alpaca paper-broker adapter, a strategy approval gate, LLM qualitative briefs with decision evidence, and a market-hours-aware cycle scheduler.
- ~18.4k LOC TypeScript with ~162 test blocks and a test file beside nearly every module, including LLM OAuth smoke tests.
- Background worker coordinated entirely through Postgres (no message broker), shipped as a self-contained tailnet docker-compose stack with healthchecks.
- Hard paper-money safety boundary: live-broker flip disabled, credential file unmounted, audited broker_flip_log table.

## Skills

TypeScript, Node.js, React, Redux Toolkit, PostgreSQL, Docker, Tailscale, Multi-Agent Orchestration, Schema Design & Migrations, Threat Modeling, Test-Driven Development

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
