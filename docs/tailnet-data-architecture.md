# Serving Dynamic Data to a GitHub Pages Site from the Tailnet

Exploration of: (1) whether the site's "customized data" can live in a
database on the tailnet that the site pulls from, and (2) per-UUID
personalized pages whose links can be attached to job applications, with
visibility into when/where each link is opened.

## The physical constraint everything follows from

GitHub Pages serves static files to the public internet. When a visitor opens
the site, **their browser** is the client for every subsequent data fetch —
GitHub never fetches anything on your behalf. A tailnet is a private overlay
network; visitors are not on it and never will be.

So "expose the DB over the tailnet and have the site pull from it" cannot
work in its literal form: a tailnet-only service is unreachable from a
recruiter's browser by design. That unreachability is the tailnet's entire
security value. The honest formulation of the goal is:

> Keep **editing** private (on the tailnet), and decide deliberately which
> **read paths** become public, through what boundary.

Three architectures satisfy that, and they compose.

## Architecture A — Publish-from-private (what the site already does)

The Flask/JSON authoring stack is effectively a private CMS; publishing bakes
its state into static HTML pushed to the deploy repo. Running the author
server on a tailnet machine and publishing from anywhere on the tailnet is a
zero-new-exposure upgrade: nothing public exists except the static output.

- **Right for:** all general site content — pages, projects, resume data.
  Content that changes on human timescales should not make the public site
  depend on a live server.
- **Hard limit:** anything baked into the repo is public *forever* (git
  history) and identical for every visitor. Per-recruiter data must never
  ship this way — a JSON of `{uuid: {name, company, note}}` in a public repo
  would publish your entire outreach list. No client-side trick fixes that.
- **No observability:** GitHub Pages exposes no request logs, so static-only
  can never tell you a link was clicked.

Conclusion: personalization and click visibility require *some* always-on
public endpoint. The question is only which one and how narrow.

## Architecture B — Tailscale Funnel: a deliberate, narrow public boundary

Tailscale has two related features. `tailscale serve` exposes a local port to
your **tailnet only**. `tailscale funnel` additionally relays it to the
**public internet** at `https://<machine>.<tailnet>.ts.net` with automatic
TLS. Two properties matter for the threat model:

- Funnel traffic is public by definition — tailnet ACLs do not protect a
  funneled path. Anything funneled must be treated exactly like an
  internet-facing service, because it is one.
- Traffic relays through Tailscale's ingress, so your home IP is not
  revealed, and inbound exposure is limited to the specific port/path you
  funnel (Funnel supports 443/8443/10000). The client's real IP is passed
  through to your service (via forwarded headers) for logging.

The design that makes this safe is **one service, two doors**:

```
┌────────────────────────── tailnet machine ──────────────────────────┐
│  personalization service (container, non-root, own sqlite file)     │
│                                                                     │
│  admin/CRUD routes  ◄── tailscale serve  ◄── you, on the tailnet    │
│  GET /v/<uuid>      ◄── tailscale funnel ◄── public internet        │
└─────────────────────────────────────────────────────────────────────┘
```

- The **only** funneled surface is a read-only lookup: `GET /v/<uuid>` →
  small JSON of display-safe fields. No list endpoint, no write endpoint, no
  admin route reachable from the funnel. Enforce the split in the app
  (separate routers/ports), not just in proxy config — the boundary should
  hold even if the proxy is misconfigured.
- The database never faces the internet. The API is the trust boundary;
  validate there (UUID format check, unknown → 404), keep the interior
  clean.
- CORS pinned to `https://scshafe.github.io`; rate-limit lookups; return
  404 for unknown UUIDs with no timing/shape difference from revoked ones.
- Run it as a low-privilege container so "compromise of the service" ≠
  "compromise of the machine on your home network". The blast radius worth
  designing for is the box, not the API.

**Real risks, named:**

| Threat | Realistic? | Response |
| --- | --- | --- |
| Scanners hitting the funnel URL | Certain (all public endpoints get scanned) | Tiny read-only surface; nothing to enumerate; rate limit |
| UUID guessing | Not realistic (v4 = 122 random bits) | Also rate-limit; treat UUIDs as revocable capabilities |
| A recipient shares their link | Likely eventually | Only put data in a page you'd be comfortable with the *company* seeing; revoke = delete row |
| Laptop asleep → API down | Certain, regularly | Site must degrade gracefully (below); or move read path to an edge host (Arch. C) |
| Tailscale account takeover | Low, high impact | The account is now infrastructure: strong auth + MFA |
| Home machine compromise via service bug | Low | Container, non-root, read-only mounts, no secrets in the service |

**Explicitly not protected:** availability (a personal laptop is not an SLA),
and confidentiality of the *fact* that a personalization service exists
(ts.net hostnames are discoverable via certificate transparency logs — put
nothing sensitive in the machine name).

## Architecture C — Managed edge as the public read path

If Funnel's availability story bothers you (it should, a little): keep the
tailnet as the **editing plane** and push snapshots to a free always-on edge
store — e.g. a Cloudflare Worker + KV (or D1) serving `GET /v/<uuid>` and
logging clicks. Updates flow from a tailnet machine via CLI (`wrangler`), so
day-to-day editing still feels private and easy; the public endpoint is
someone else's 24/7 problem. This is the same trust boundary as B with better
uptime and less home-network surface — the trade is self-hosting purity.

A reasonable path: build against Funnel first (fastest, most fun, everything
stays yours), design the site-side fetch with a hard timeout and fallback,
and move the read path to a Worker unchanged if uptime starts mattering for
real job applications. The URL scheme below survives the move.

## Per-UUID personalized links

**URL shape.** Avoid true paths like `/r/<uuid>` — GitHub Pages 404s unknown
paths (the `404.html` trick works but returns HTTP 404 and adds moving
parts). Use a real prerendered page with the token after `?` or `#`:

```
https://scshafe.github.io/hi/?k=3f8c2a9e-....
```

`#token` has the nicest privacy property (fragments never appear in any
server's logs); `?k=` is fine too since GitHub doesn't show you logs anyway.

**Flow.** `/hi/` is a normal static page (a View or a small route like
`/projects`). On load, its script reads the token; if absent, it renders a
default greeting and stops. If present, it fetches `GET <api>/v/<uuid>` with
a ~2s timeout. On 200 it renders the personalized layer (greeting, which
projects to spotlight, a tailored note); on 404/timeout/error it renders the
default page. Personal data never exists in the repo, in the built HTML, or
in git history — it lives only in the private store and transits per-request.

**The fetch is the click beacon.** Server-side, log `{uuid, timestamp,
user-agent, referrer, ip → coarse geo}` on every lookup. That directly
answers "did the recruiter from application X open my link, and when" — no
extra tracking machinery needed. Failure mode to accept: if the API is down
at click time, you lose that click's log *and* they see the default page,
which is exactly why the default page must be great on its own.

**Capability hygiene.** A UUID link is a bearer capability. Generate v4 per
recipient, never reuse across applications, keep a private mapping table
(uuid → who/company/sent-date), revoke by deleting the row, and consider
auto-expiry (~90 days) so forgotten links die on their own.

**A taste note, not a security note:** "Hi Jane —" on page load reveals the
tracking. Some readers find it delightful, some find it surveilly. A softer
default is to personalize *emphasis* (which projects float to the top, a
one-line "since you're hiring for infra…") rather than naming the person.
Either way: minimal data, short retention, and nothing on the page you
wouldn't want forwarded — assume every personalized link eventually gets
shared. (An identifier plus IP logs of an EU recipient is technically
personal data; for a personal job search the pragmatic response is data
minimization and short retention, not a compliance program.)

## Recommendation

1. **Keep general content on the publish-from-private path** (Architecture
   A). It's already built, free, and unbreakable by traffic.
2. **Build personalization as a separate tiny service** with the two-door
   layout (Architecture B): admin via `tailscale serve` (tailnet-only),
   public read-only lookup via Funnel. SQLite is plenty. Do not extend the
   authoring Flask server for this — it was never designed to be
   internet-facing, and mixing the site's CMS with a public API couples the
   blast radii. [Verify current specifics against Tailscale docs when
   building: Funnel must be enabled by ACL attribute, allowed ports
   443/8443/10000, and forwarded-IP header behavior.]
3. **Design the site-side fetch as progressive enhancement** — default page
   first, personalization as a bonus layer. This converts the worst risk
   (your laptop is asleep) from "broken link in front of a recruiter" to
   "slightly less fancy page".
4. **If/when uptime matters, lift the read path to an edge Worker**
   (Architecture C) without changing links; the tailnet remains the editing
   plane.

The one-paragraph security model, for the record: *everything editable lives
on the tailnet and is reachable only over it; the public internet can reach
exactly two things — static files on GitHub Pages, and one read-only,
rate-limited lookup endpoint that resolves unguessable per-recipient tokens
into display-safe JSON and logs the access; nothing else is exposed, and the
site remains fully functional if that endpoint is offline.*
