---
title: applysim
summary: Test-only, zero-dependency end-to-end exerciser for the JobTrack + Inbox job-search pipeline: a deterministic ATS lifecycle-email emitter drives the real pipeline seams through submit/follow-up/interview/reschedule/assessment/rejection/offer paths plus adversarial injection cases. The entire outbou…
status: active
tags: [javascript, node-js, terraform, tailscale]
repo: https://github.com/scshafe/applysim
started: 2026-07
updated: 2026-07-28
---

## What it is

Test-only, zero-dependency end-to-end exerciser for the JobTrack + Inbox job-search pipeline: a deterministic ATS lifecycle-email emitter drives the real pipeline seams through submit/follow-up/interview/reschedule/assessment/rejection/offer paths plus adversarial injection cases. The entire outbound-email path is deliberately disabled. Role: Architect of the guardrail posture and scenario taxonomy (substantially agent-built under direction).

## Highlights

- 56-scenario coverage matrix across 8 lifecycle paths and 13 ATS vendor profiles (Greenhouse, Lever, Workday, Ashby, iCIMS, Taleo, SuccessFactors, BambooHR, LinkedIn, and portal/custom/email tiers), backed by ~210 assertions and a coverage manifest.
- Dependency-free JSON Schema draft-2020-12 validator, $ref-resolving schema store, and canonical-JSON digest in pure Node stdlib.
- Enforced (not just documented) safety guardrails: outbound email needs a second reviewed code flip beyond configuration, and verify:guardrails statically fails the build on send primitives, terraform apply, or hard-coded credentials.
- Opt-in cross-repo integration tier that imports the real inbox-pipeline build and spawns the real jobtrack CLI against a throwaway store, self-skipping when siblings are absent.

## Skills

JavaScript, Node.js, Terraform, Tailscale, JSON Schema Contracts, Content-Addressed Provenance, Security Sandboxing & Trust Boundaries

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
