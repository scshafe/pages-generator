---
title: Voice Journey
summary: Longitudinal analysis groundwork over five years of personal Apple Voice Memos - 2,433 recordings - building corpus access, rebuildable indexing, and a DSP classification pass separating singing from non-singing and flagging noise/music contamination. Audio bytes are never committed; the repo holds…
status: completed
tags: [node-js, ffmpeg, whisper-cpp, tailscale]
started: 2026-07
updated: 2026-07-28
---

## What it is

Longitudinal analysis groundwork over five years of personal Apple Voice Memos - 2,433 recordings - building corpus access, rebuildable indexing, and a DSP classification pass separating singing from non-singing and flagging noise/music contamination. Audio bytes are never committed; the repo holds only code and repo-safe manifests. Role: Operator and release gate (agent-built under MC release-gate workflow).

## Highlights

- Processed a 2,433-recording five-year corpus end to end: metadata index, ffmpeg DSP classification into five buckets, whisper.cpp local STT, and cross-recording lyric-match indicators - ~12 MB of repo-safe JSON with zero audio bytes committed.
- Capability-scoped host-access seam so sandboxed agents never touch ~/Library directly: describe/list/metadata/read-handle only, every mutation verb refused, read-handle gated on an explicit approval note.
- Every long-running pass resumable by recordingId, so interrupted multi-hour transcription runs resume instead of re-decoding thousands of files.
- Read-only corpus browser with a deterministic stratified spot-check review queue; transcripts served only from a gitignored local store.

## Skills

Node.js, FFmpeg, whisper.cpp, Tailscale, Digital Signal Processing, Speech-to-Text Pipelines, Privacy-Preserving Architecture, Security Sandboxing & Trust Boundaries

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
