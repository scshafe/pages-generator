# Publishing profile/projects data from JobTrack

JobTrack (private, tailnet-only) is the system of record for professional
data. The only sanctioned crossing point between it and this public site is
the allowlisted export artifact — the site never calls JobTrack at runtime,
JobTrack never serves public traffic, and Tailscale Funnel stays off
everywhere. The artifact contract lives in the jobtrack repo at
`contracts/export/public-profile.v2.schema.json`; the export command
validates against it and fails closed on any redaction violation before a
byte is written. v2 carries JobTrack's curation into the site: pinned
entries arrive first and become `featured`, hidden entries never arrive
(the ingest deletes their previously generated pages), project kinds
become leading tags, only PUBLIC-visibility repos produce repo links, and
`uses` relations render as Built-with cross-links.

## The publish sequence

**GitHub Actions owns deployment** (`.github/workflows/deploy.yml`): every push
to `main` builds from the committed content snapshot and pushes the static
export to `scshafe/scshafe.github.io` as `Deploy from pages-generator@<sha>`.
Do NOT push to the site repo manually while CI is active — the two will race
(a manual snapshot commit gets non-fast-forward-rejected or overwritten by the
next CI deploy).

```bash
# 1. Export from JobTrack (validates + redaction-scans; fails closed)
cd ~/.mission-control/projects/jobtrack
node bin/jobtrack.js export public-profile --out ~/.jobtrack/public-profile.json

# 2. Regenerate the site's project entries from the artifact
cd ~/Projects/pages-generator
node scripts/ingest-jobtrack.mjs          # add --dry-run to preview

# 3. Validate the generated entries
npm run projects:validate

# 4. (Optional) local preview build. On a machine WITHOUT the author content
#    graph (content/ is gitignored; only the committed content/metadata.json
#    snapshot exists), never run export:metadata or add-build-timestamp — they
#    would regenerate a gutted metadata.json from the missing graph:
git checkout -- content/metadata.json   # ensure the authoritative snapshot
NEXT_PUBLIC_BUILD_MODE=publish npx next build && node scripts/isolate-static.mjs

# 5. Belt-and-suspenders leak scan of the preview (expect: email scan empty;
#    the digit scan flags 10-digit CMS entity ids — eyeball, not phone numbers)
grep -rEo "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}" .static-out --include='*.html' --include='*.txt'

# 6. Publish: commit the regenerated projects/*.md and push main — CI deploys.
git add projects docs scripts && git commit -m "content: refresh from JobTrack export" && git push
# Fallback ONLY if CI is down: node scripts/export-build.mjs, then commit+push
# ../scshafe.github.io manually.
```

## Ingestion rules

- `scripts/ingest-jobtrack.mjs` writes one `projects/<slug>.md` per artifact
  project and owns those files completely: re-runs rewrite them in place, and
  manual edits to generated files are overwritten. Hand-authored entries
  (e.g. `pages-generator.md`) are never touched; the artifact's own
  pages-generator entry is skipped for exactly that reason.
- Skill names on each page come from the artifact's relational
  project→skill links (uuid references resolved against its `skills`
  section) — JobTrack's skill graph, rendered publicly.
- Editing project content therefore happens in JobTrack
  (`jobtrack profile update` / `skill-link`), then re-export and re-ingest.
