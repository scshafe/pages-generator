---
title: agent-config-scshafe
summary: Portable Claude Code configuration: a curated set of 10 subagent specialists, 7 skills, and a shared output-style contract that travel across machines via a bare-repo + work-tree dotfiles setup rooted at ~/.claude. Encodes an engineering-for-emergence, agent-first philosophy in prompt form.
status: completed
tags: [tool, python]
started: 2026-05
updated: 2026-07-28
order: 6
---

## What it is

Portable Claude Code configuration: a curated set of 10 subagent specialists, 7 skills, and a shared output-style contract that travel across machines via a bare-repo + work-tree dotfiles setup rooted at ~/.claude. Encodes an engineering-for-emergence, agent-first philosophy in prompt form. Role: Primary author.

## Highlights

- 10 subagent specialists (including an exploit-finder, a statistician, and paired brainstorm/rigorous architects) plus 7 skills - ~6.8k lines of prompt and doc content.
- Deliberate architect split: one agent is explicitly instructed to contradict the user's framing to resist frame capture; the other tightens results into cited ADRs and specs.
- Two-tier memory design: portable in-repo journals for the security and testing specialists versus untracked machine-local memory for the architects.
- Bare-repo + work-tree install against ~/.claude with a whitelist .gitignore so config syncs without dragging caches or sessions.

## Skills

Python, Prompt Engineering, Multi-Agent Orchestration

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
