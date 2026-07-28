---
title: Voiceprint
summary: Local-first personal dictation corpus server in Go: permanently preserves original uploaded audio bytes, runs local Whisper transcription, and keeps raw transcript, rule-based autocorrect proposal, and human correction as three separate linked artifacts - a training corpus, not just a transcript.
status: completed
tags: [go, whisper-cpp, macos]
started: 2026-06
updated: 2026-07-28
---

## What it is

Local-first personal dictation corpus server in Go: permanently preserves original uploaded audio bytes, runs local Whisper transcription, and keeps raw transcript, rule-based autocorrect proposal, and human correction as three separate linked artifacts - a training corpus, not just a transcript. Role: Sole author.

## Highlights

- Whole pipeline in 6 commits over 2 days: corpus server, macOS capture upload helper, local transcription, human-correction review UI, personal autocorrect rules, and a verifiable export.
- Strict artifact layering: corrections never overwrite raw Whisper output, autocorrect proposals never overwrite either, and original audio is stored untranscoded with SHA-256 recorded at upload and re-verified on export.
- Structural privacy posture: the server refuses non-local bind addresses and the upload helper refuses non-local server URLs.
- Export manifest links every original/raw/autocorrect/corrected artifact with byte sizes and checksums.

## Skills

Go, whisper.cpp, macOS, Speech-to-Text Pipelines, Content-Addressed Provenance, Privacy-Preserving Architecture, CLI Design

> Generated from the JobTrack public-profile export (2026-07-28). Edit the project in JobTrack and re-run `node scripts/ingest-jobtrack.mjs` — manual edits to this file will be overwritten.
