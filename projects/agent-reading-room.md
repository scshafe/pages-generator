---
title: Agent Reading Room
summary: Private, self-hosted reading site walking an ordered library of 54 foundational essays on agent design, epistemology, curiosity, failure, and security - each with a preface, questions to carry in, and post-reading analysis. Links to authoritative originals and adds a rights-gated local narration pa…
status: completed
tags: [node-js, python, ffmpeg, whisper-cpp, tailscale, macos]
started: 2026-07
updated: 2026-07-28
---

## What it is

Private, self-hosted reading site walking an ordered library of 54 foundational essays on agent design, epistemology, curiosity, failure, and security - each with a preface, questions to carry in, and post-reading analysis. Links to authoritative originals and adds a rights-gated local narration path. Role: Curator and author (heavy agent assistance).

## Highlights

- Zero-dependency Node 24 server (~63KB) delivering 54 curated sources with reading status, notes, playback position, and last-opened source persisted via atomic JSON replacement outside the repo so deploys cannot clobber user data.
- A dated rights decision for every source (18 scoped full narration, 20 companion-only, 8 pending, 1 official-audio-only), revalidated on every audio request.
- Fully local narration path - Kokoro TTS, FFmpeg mastering, Whisper verification against the frozen script, integrity-bound publishing - with pinned model revisions and a documented license inventory.
- 151 automated checks across the server, progress store, audio pipeline, and vendored player provenance.

## Skills

Node.js, Python, FFmpeg, whisper.cpp, Tailscale, macOS, Speech-to-Text Pipelines, Content-Addressed Provenance, Privacy-Preserving Architecture

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
