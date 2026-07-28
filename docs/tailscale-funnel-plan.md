# Tailscale Funnel Personalization Service — Detailed Design

**Status:** design only — not being built yet. Companion to
[tailnet-data-architecture.md](./tailnet-data-architecture.md), which explains
*why* this shape; this doc pins down *what exactly* to build if we pursue it.
The executable checklist lives at
`.claude/plans/2026-07-28-funnel-personalization-service.md`.

**Working name:** `link-relay` — a tiny service that resolves per-recipient
UUID capability links into display-safe personalization JSON, logs each
lookup as a click event, and is administered only from the tailnet.

---

## 1. Decisions and defaults

Four decisions gate the build. Recommended defaults are safe to take as-is.

| Decision | Default | Rationale / alternative |
| --- | --- | --- |
| Where the code lives | New sibling repo `~/personal/link-relay/` | Own blast radius, own lifecycle, and it dogfoods the projects pipeline (gets its own `projects/link-relay.md`). Alternative: a `services/` dir in blog-app — rejected, couples CMS and public API lifecycles. |
| Stack | Python + Flask + sqlite3 (stdlib) + waitress | Matches blog-app backend conventions (Flask, pytest, JSON-on-disk mindset), so patterns and test habits transfer. Only two pip deps. FastAPI fine too if preferred. |
| Host machine | This MacBook for v1 | Sleep = downtime, accepted for v1 because the site degrades gracefully. The service is one folder + one sqlite file — trivially movable to an always-on box (mini/Pi) later. |
| Personalization style | Subtle emphasis by default; named greeting per-link opt-in | "Hi Jane" reveals tracking; per-link `greeting` field stays empty unless deliberately set. |

## 2. Service architecture — one process, two app objects, two ports

The isolation guarantee must live in the **application layer**, not in proxy
config: the public listener's Flask app simply has no admin routes
registered. A misconfigured funnel can then expose nothing worse than the
lookup endpoint it already exposes on purpose.

```
                 ┌──────────── link-relay process ────────────┐
                 │                                            │
 public internet │  public_app (2 routes)   admin_app (CRUD)  │
 ──[Funnel 443]──┼─► 127.0.0.1:4100         127.0.0.1:4101 ◄──┼──[tailscale serve]── you
                 │        │                      │            │
                 │        └──────► sqlite ◄──────┘            │
                 │              links.db                      │
                 └────────────────────────────────────────────┘
```

- Both apps served by waitress from one entrypoint (`python -m linkrelay`),
  both bound to loopback only. Nothing listens on 0.0.0.0.
- Ports 4100/4101 mirror blog-app's 4000/4001 convention.
- Run as the login user via launchd for v1; containerizing is the upgrade
  path if the service ever grows beyond two deps.

## 3. Data model (sqlite)

```sql
CREATE TABLE IF NOT EXISTS links (
  uuid        TEXT PRIMARY KEY,          -- uuid4, generated server-side only
  label       TEXT NOT NULL,             -- private: "Acme staff-eng app 2026-07"
  company     TEXT,                      -- private, for your log reading
  contact     TEXT,                      -- private
  greeting    TEXT,                      -- PUBLIC if set ("Hi Jane —"); default NULL
  note        TEXT,                      -- PUBLIC if set: one tailored sentence
  spotlight   TEXT NOT NULL DEFAULT '[]',-- PUBLIC: JSON array of project slugs/tags
  created_at  TEXT NOT NULL,
  expires_at  TEXT,                      -- default created+90d; NULL = never
  revoked_at  TEXT                       -- soft revoke; row kept for click history
);

CREATE TABLE IF NOT EXISTS clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  link_uuid   TEXT NOT NULL REFERENCES links(uuid),
  ts          TEXT NOT NULL,
  user_agent  TEXT,
  referrer    TEXT,
  ip          TEXT,                      -- from forwarded header; purged by retention job
  geo         TEXT                       -- optional coarse "country/city", filled offline
);
```

The public/private split is per-column and must be enforced in one place: a
`to_public_json(link)` function that whitelists `greeting`, `note`,
`spotlight` — never serialize a row directly.

## 4. Public API contract (the entire funneled surface)

**`GET /v/<uuid>`**
- Malformed UUID → `404` immediately (regex check before any DB touch).
- Unknown, revoked, or expired → `404` with a body **byte-identical** to the
  malformed case (no oracle distinguishing "never existed" from "revoked").
- Valid → `200` `{"greeting": str|null, "note": str|null, "spotlight": [..]}`.
- Every request (including 404s) appends a click row when the UUID parses;
  the lookup **is** the click beacon.
- Headers: `Cache-Control: no-store`; `Access-Control-Allow-Origin:
  https://scshafe.github.io` (exact origin, no `*`, no credentials).
- Rate limit: in-memory token bucket per client IP (from forwarded header),
  ~10 req/min sustained → `429`. State resets on restart; that's fine.

**`GET /healthz`** → `204`, no body, not rate-limited. Safe to expose.

That is the complete public surface. No list, no write, no admin, no static
files.

## 5. Admin surface (tailnet-only)

Routes on `admin_app` (port 4101):

- `POST /admin/links` `{label, company?, contact?, greeting?, note?,
  spotlight?, expires_days?}` → mints uuid4 server-side, returns the full
  paste-ready URL: `https://scshafe.github.io/hi/#k=<uuid>`.
- `GET /admin/links` → all links + click counts.
- `GET /admin/clicks?uuid=…` → click rows for one link.
- `POST /admin/links/<uuid>/revoke` → sets `revoked_at`.
- `POST /admin/retention/purge` → apply retention rules now (also run by a
  scheduled job, §8).

Reachability, two layers:
1. **Network:** `admin_app` binds loopback; tailnet access goes through
   `tailscale serve` (serve without funnel = tailnet-only by definition).
2. **App:** admin routes require the `Tailscale-User-Login` header injected
   by serve to equal the configured owner login, OR a direct loopback
   connection (for local curl/CLI). Belt and suspenders — the primary
   guarantee remains that these routes don't exist on the funneled app.

A CLI wrapper (`python -m linkrelay mint --label "Acme app"`) around the
HTTP admin API is worth the hour: minting from a terminal is the actual
workflow when firing off applications.

## 6. Tailscale wiring

Prerequisites (one-time, admin console): enable MagicDNS + HTTPS
certificates; enable the Funnel node attribute for this machine (the CLI
prompts with the exact policy edit on first use). **Rename the machine
first** to something neutral like `edge` — funnel hostnames land in public
certificate-transparency logs, so `coles-macbook-pro.tailXXXX.ts.net` leaks
more than it needs to.

Intended state (flag syntax drifts between tailscale versions — verify with
`tailscale serve --help` when building; the invariant below is what matters):

```bash
tailscale funnel --bg http://127.0.0.1:4100         # public door, :443
tailscale serve  --bg --https=8443 http://127.0.0.1:4101   # tailnet door
```

**Invariant to verify after any config change:** `tailscale funnel status`
lists exactly one target (4100). The admin mapping appears only in
`tailscale serve status`. If the admin port ever shows under funnel status,
tear down and reconfigure before proceeding.

TLS terminates on this machine (certs are node-local), so Tailscale's
ingress relays opaque bytes — it cannot read traffic. Client IPs arrive via
forwarded header from the local tailscaled proxy; confirm the exact header
name empirically during the build and log that one.

## 7. Site integration (blog-app)

- New code route `app/hi/page.tsx` (+ `"/hi"` added to
  `RESERVED_VIEW_PATH_PREFIXES` in `lib/content/paths.ts`).
- The page is a complete, good default page with zero token — assume most
  visits are organic or the API is asleep.
- A small client component reads the token: `#k=<uuid>` preferred (fragments
  never reach any server log), `?k=` accepted for tools that strip
  fragments. Then `fetch(API_BASE + "/v/" + uuid)` with a 2-second
  `AbortController` timeout.
- On `200`: render the personalization layer — greeting banner if present,
  the one-line note, and float `spotlight` projects to the top of the
  projects strip. On anything else: render nothing extra. No spinners, no
  layout shift — reserve the banner slot or insert above the fold cleanly.
- `NEXT_PUBLIC_LINK_API_BASE` env var (e.g. `https://edge.tailXXXX.ts.net`)
  baked at build time; empty value disables the fetch entirely, so the site
  never depends on the service existing.
- Nothing per-recipient is ever baked into the build or the repo.

## 8. Operations

- **Process:** launchd agent (`~/Library/LaunchAgents/com.cole.linkrelay.plist`),
  `KeepAlive` + `RunAtLoad`. Logs to `~/Library/Logs/linkrelay/`.
- **Backups:** the sqlite file rides Time Machine; additionally
  `sqlite3 links.db ".backup ..."` weekly via the retention job. Losing this
  DB loses click history and breaks outstanding links — cheap to protect.
- **Retention:** clicks older than 180 days purged; `ip` column nulled after
  30 days (the "who clicked when" signal survives; the personal-data tail
  shrinks). Links expire 90 days after mint by default.
- **Monitoring:** none for v1, accepted. If it starts mattering, a
  tailnet-side uptime check (another device curling `/healthz`) beats any
  external monitor — it tests the same path you control.

## 9. Security model (the one-paragraph version)

Everything writable is reachable only over the tailnet or loopback; the
public internet reaches exactly two routes — a rate-limited, read-only
lookup that resolves unguessable per-recipient tokens into three whitelisted
display fields and logs the access, and a bodyless health check; the
funneled app object contains no other routes, private columns never pass the
single serializer, unknown/revoked/expired tokens are indistinguishable, and
the site remains fully functional with the service offline.

**Explicitly not protected:** availability (laptop sleep = downtime, by
design); the existence of the service (CT logs make the hostname public);
recipients forwarding their own links (mitigated by content discipline —
nothing on a personalized page you wouldn't want forwarded); and a
compromised host machine (mitigated only by the service holding no secrets
and running unprivileged).

## 10. Testing and acceptance

Unit (pytest): lookup happy path; malformed/unknown/revoked/expired all
byte-identical 404; expiry boundary; rate-limit 429; public serializer
whitelist (a new private column must not leak without a test change); admin
auth rejection without/with wrong identity header; retention purge; mint
returns well-formed URL.

Manual matrix before first real use (run from a phone on cellular, not wifi):

| From | Request | Expect |
| --- | --- | --- |
| Public internet | `GET https://<host>/v/<valid>` | 200, correct JSON, click row appears |
| Public internet | `GET https://<host>/v/<random-uuid>` | 404 |
| Public internet | any `/admin/*`, port 8443, port 4101 | unreachable / 404 |
| Tailnet | admin mint + list | 200 |
| Anywhere | `/hi/#k=<valid>` on the live site | personalized page |
| Anywhere, service stopped | `/hi/#k=<valid>` | clean default page, no console errors, no jank |

## 11. Future: lifting to an edge worker

If uptime starts to matter for live applications: reimplement §4 only (two
routes) as a Cloudflare Worker with KV; a tailnet-side script pushes link
snapshots via `wrangler`, and click logs land in Workers Analytics or a
queue. Links, the site page, and the admin plane don't change — the URL in
recruiters' hands is `scshafe.github.io/hi/#k=…`, which never encoded where
the API lives beyond one env var.
