---
title: JobTrack
summary: Private, agent-operable job-search system: a SQLite store with a JSON-first CLI as the only writer, a read-only tailnet web view, and a sandboxed LaTeX render pipeline. Keeps discovered opportunities separate from applications, preserves immutable posting provenance, and records the full applicatio…
status: active
tags: [node-js, javascript, sqlite, express, docker, tailscale, latex]
repo: https://github.com/scshafe/jobtrack
started: 2026-06
updated: 2026-07-28
---

## What it is

Private, agent-operable job-search system: a SQLite store with a JSON-first CLI as the only writer, a read-only tailnet web view, and a sandboxed LaTeX render pipeline. Keeps discovered opportunities separate from applications, preserves immutable posting provenance, and records the full application lifecycle with evidence-bearing normalization. Role: Architect, orchestrator, and release gate (built by a Mission Control agent swarm under direction).

## Highlights

- Normalized job-graph schema migration (v7) separating canonical openings from publication venues, with a dual-write integrity suite proving legacy records, snapshot hashes, and private profile data survive.
- Proposal-only unattended-discovery sandbox with three isolated trust zones: an SSRF-hardened dual-homed egress broker, a network-less strategy worker, and strict contract validators addressing bundles by SHA-256 of canonical JSON.
- 7 release tags (v0.2.0-v0.7.0) deployed via Docker + Tailscale Serve with a funnel-off verification gate, loopback-only publication, and read-only store mounts.
- ~23k LOC with 300+ tests covering dual-write integrity, server security, egress policy, and core invariants.

## Skills

Node.js, JavaScript, SQLite, Express, Docker, Tailscale, LaTeX, Schema Design & Migrations, Security Sandboxing & Trust Boundaries, Content-Addressed Provenance, Event-Sourced Architecture, Privacy-Preserving Architecture, CLI Design

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
