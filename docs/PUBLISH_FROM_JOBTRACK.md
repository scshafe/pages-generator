# Publishing profile/projects data from JobTrack

JobTrack (private, tailnet-only) is the system of record for professional
data. The only sanctioned crossing point between it and this public site is
the allowlisted export artifact — the site never calls JobTrack at runtime,
JobTrack never serves public traffic, and Tailscale Funnel stays off
everywhere. The artifact contract lives in the jobtrack repo at
`contracts/export/public-profile.v1.schema.json`; the export command
validates against it and fails closed on any redaction violation before a
byte is written.

## The publish sequence

```bash
# 1. Export from JobTrack (validates + redaction-scans; fails closed)
cd ~/.mission-control/projects/jobtrack
node bin/jobtrack.js export public-profile --out ~/.jobtrack/public-profile.json

# 2. Regenerate the site's project entries from the artifact
cd ~/Projects/pages-generator
node scripts/ingest-jobtrack.mjs          # add --dry-run to preview

# 3. Validate the generated entries
npm run projects:validate

# 4. Build the fully static site (publish mode)
#    On the AUTHORING machine (content/nodes etc. present):
NEXT_PUBLIC_BUILD_MODE=publish PATH="$PWD/env/bin:$PATH" npm run build

#    On a machine WITHOUT the author content graph (content/ is gitignored;
#    only the committed content/metadata.json snapshot exists): do NOT run
#    export:metadata or add-build-timestamp — they would regenerate a gutted
#    metadata.json from the missing graph. Instead build from the committed
#    snapshot directly:
git checkout -- content/metadata.json   # ensure the authoritative snapshot
NEXT_PUBLIC_BUILD_MODE=publish npx next build
node scripts/isolate-static.mjs
node scripts/export-build.mjs           # copies .static-out into ../scshafe.github.io

# 5. Belt-and-suspenders leak scan of the tree that ships (expect: email scan
#    empty; the digit scan may flag 10-digit CMS entity ids and asset
#    timestamps — eyeball that every hit is an id, not a phone number)
grep -rEo "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}" ../scshafe.github.io --include='*.html' --include='*.txt' --exclude-dir=.git
grep -rEo "([0-9][[:space:]().-]?){10,}" ../scshafe.github.io --include='*.html' --include='*.txt' --exclude-dir=.git

# 6. Publish to scshafe.github.io — the only outward-facing step
#    Authoring machine: npm run push-static
#    Content-less clone (build already copied by export-build above):
cd ../scshafe.github.io && git add -A && git commit -m "Update static export $(date -u +%Y-%m-%dT%H:%M:%S.000Z)" && git push
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
