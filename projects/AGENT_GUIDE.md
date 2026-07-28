# Agent Guide: Adding Your Project to Cole's Personal Site

You are an agent working in one of Cole's project repositories, and you've been
asked to describe that project on his personal site (https://scshafe.github.io).
This guide tells you exactly what to do. Follow it precisely — deviations
(especially touching files that aren't yours) can break other agents' work.

## The one-paragraph version

Write **one markdown file** at
`/Users/coleshaffer/personal/blog-app/projects/<your-slug>.md` using the
frontmatter schema below, then run the validator. Do not create, edit, or
delete any other file. Discovery is automatic — there is no index, registry,
or nav file to update. The site's Projects page is rebuilt from this directory
when Cole next publishes.

## Isolation rules (why this works in parallel)

Multiple agents from different repositories write here concurrently. The
system is safe because each project owns exactly one file and nothing else is
shared:

1. **Your file is `<your-slug>.md` in this directory. That is the only file
   you may create or modify.** Never touch other `*.md` files, `_template.md`,
   this guide, or any code in the blog-app repository.
2. **Never create or edit an index/registry.** The site build discovers files
   in this directory automatically.
3. If your project needs images, they go in
   `/Users/coleshaffer/personal/blog-app/public/project-assets/<your-slug>/`
   (your slug's folder only) and are referenced in your markdown as
   `/project-assets/<your-slug>/<name>.png`.
4. To update your entry later, rewrite your own file completely and bump
   `updated`. Writes are idempotent — the file is the entire source of truth
   for your project's entry.

## Choosing your slug

- Lowercase kebab-case: letters `a-z`, digits `0-9`, single hyphens
  (regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`).
- Use your repository's directory name unless it's cryptic
  (e.g. repo `agent-tools` → `agent-tools.md`).
- If the file already exists and describes *your* project, update it. If it
  describes a *different* project, pick a more specific slug — never
  overwrite someone else's entry.
- Your project's page will be published at `/projects/<your-slug>/`.

## File format

The file is markdown with a YAML-style frontmatter block. Only the fields
below are allowed (unknown fields are validation errors). The parser supports
scalars, inline arrays `[a, b]`, and block lists (`- item` lines) — no nested
objects, no multi-line strings.

```markdown
---
title: Human-Readable Project Name
summary: One or two sentences shown on the project card. Max 300 chars.
status: active
tags: [typescript, agents, cli]
repo: https://github.com/scshafe/example
demo: https://example.com
started: 2026-01
updated: 2026-07-28
featured: false
order: 100
---

## What it is

Two or three paragraphs. Write for a technical visitor who has never seen
the project...
```

| Field      | Required | Type / format                                          | Notes                                    |
| ---------- | -------- | ------------------------------------------------------ | ---------------------------------------- |
| `title`    | yes      | string, ≤ 120 chars                                    | Must be unique across all projects       |
| `summary`  | yes      | string, ≤ 300 chars                                    | Card text on the Projects page           |
| `status`   | no       | `active` `exploring` `paused` `completed` `archived`   | Default `active`                         |
| `tags`     | no       | array of ≤ 8 strings, each ≤ 24 chars                  | Lowercase preferred                      |
| `repo`     | no       | `https://` URL                                         | Omit if the repo is private/local        |
| `demo`     | no       | `https://` URL                                         |                                          |
| `started`  | no       | `YYYY-MM` or `YYYY-MM-DD`                              |                                          |
| `updated`  | no       | `YYYY-MM-DD`                                           | Bump on every edit                       |
| `featured` | no       | `true` / `false`                                       | Featured entries sort first              |
| `order`    | no       | number                                                 | Lower sorts earlier; default 100         |

## Body guidelines

The body (below the closing `---`) is rendered as the project's detail page.

- Recommended sections: `## What it is`, `## Why`, `## How it works`,
  `## Status & learnings`. Adapt as needed; `##`/`###` headings only
  (the page supplies the `#` title).
- Standard markdown only: paragraphs, lists, links, code fences, blockquotes,
  images. **No raw HTML** — it is not sanitized away, so by policy don't use it.
- Write for an outside technical reader: no internal file paths, no secrets,
  no API keys, no absolute local paths, nothing you wouldn't publish.
- Keep it under ~500 lines. This is a portfolio entry, not documentation.

## Validate before you finish

From any directory:

```bash
npm --prefix /Users/coleshaffer/personal/blog-app run projects:validate
```

Every file must report `OK`. If your file reports `ERROR`, fix it and re-run.
An invalid file fails the site build, so do not finish your task while the
validator is failing on your file.

Optionally preview the rendered result (only if asked to): from
`/Users/coleshaffer/personal/blog-app`, run `npm run author` and open
`http://localhost:4000/projects/`.

## What happens next

Nothing publishes automatically. Cole reviews the directory and runs the
site's publish pipeline; your entry then appears at
`https://scshafe.github.io/projects/<your-slug>/`. Your job ends when your
file exists and the validator passes.
