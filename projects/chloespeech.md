---
title: ChloeSpeech
summary: Deterministic, provider-neutral speech-rendering library and CLI: an application-neutral cue sheet plus versioned voice manifests become mastered audio, immutable render evidence, and checksum-bound QC reports. Shared substrate consumed by two downstream applications via pinned commits.
status: completed
tags: [python, ffmpeg, latex]
started: 2026-07
updated: 2026-07-28
---

## What it is

Deterministic, provider-neutral speech-rendering library and CLI: an application-neutral cue sheet plus versioned voice manifests become mastered audio, immutable render evidence, and checksum-bound QC reports. Shared substrate consumed by two downstream applications via pinned commits. Role: Director (substantially agent-built in a day under direction; credited 'Cole and Chloe').

## Highlights

- Eight TTS provider adapters (Kokoro, Piper, eSpeak NG, macOS say, HF Transformers, ElevenLabs, Chatterbox) behind one contract, each executed in a provider-scoped isolated environment over an NDJSON worker protocol so no process imports every TTS stack.
- Plan identity derived from canonical JSON of every output-affecting input, enabling content-addressed segment reuse, resume, atomic publication, and tamper detection on immutable render manifests.
- 238 pytest tests under a 90% branch-coverage floor with mypy --strict and ruff; offline Whisper QC passes at zero word errors on the flagship provider.
- Two-pass EBU R128 loudness mastering via FFmpeg with pinned model revisions and SHA-256 supply-chain pins.

## Skills

Python, FFmpeg, LaTeX, Content-Addressed Provenance, Speech-to-Text Pipelines, Release Engineering, Test-Driven Development

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
