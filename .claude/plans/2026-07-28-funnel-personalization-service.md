# Plan: Funnel personalization service (link-relay)

**Goal:** UUID capability links on job applications resolve to personalized content on the live site, with per-link click logs, served from a tailnet machine via Tailscale Funnel.
**Out of scope:** general site content (stays on the static publish path), the Cloudflare Worker lift (design §11), any monitoring/alerting, named-greeting content decisions per recruiter.

## Context

Design doc: `docs/tailscale-funnel-plan.md` (in blog-app) — section numbers below refer to it. Not started; this plan is parked until Cole decides to pursue it. Core invariants the executor must preserve: the funneled Flask app object has only `/v/<uuid>` + `/healthz`; private DB columns pass through one whitelist serializer; unknown/revoked/expired lookups are byte-identical 404s; the site page works fully with the service offline.

## Steps

- [ ] **Step 1: Confirm the four §1 decisions with Cole**
  - Verify: human review — repo home, stack, host machine, personalization default each confirmed or overridden
  - Notes: defaults in design §1 are pre-approved recommendations; a bare "go with defaults" resolves this step.

- [ ] **Step 2: Scaffold `~/personal/link-relay` repo**
  - git init, venv at `env/`, deps `flask waitress pytest`, package layout `linkrelay/{__main__,store,public_app,admin_app,serialize}.py`, `tests/`
  - Verify: `cd ~/personal/link-relay && ./env/bin/python -m pytest -q` exits 0 (collects 0 tests)

- [ ] **Step 3: Storage module + schema (§3)**
  - `store.py`: connection helper, `CREATE TABLE IF NOT EXISTS` for `links`/`clicks`, mint/get/revoke/record_click/purge functions, all timestamps UTC ISO-8601
  - Verify: `./env/bin/python -m pytest tests/test_store.py -q`

- [ ] **Step 4: Public serializer with whitelist test (§3, §9)**
  - `serialize.py::to_public_json` returning only `greeting`, `note`, `spotlight`; test asserts the returned key set exactly, so any new column fails the test until explicitly classified
  - Verify: `./env/bin/python -m pytest tests/test_serialize.py -q`

- [ ] **Step 5: Public app — lookup, click logging, identical 404s, rate limit (§4)**
  - Two routes only; UUID regex pre-check; token-bucket per forwarded IP → 429; CORS pinned to `https://scshafe.github.io`; `Cache-Control: no-store`
  - Verify: `./env/bin/python -m pytest tests/test_public.py -q` (must include byte-identical-404 and 429 cases)

- [ ] **Step 6: Admin app + CLI mint (§5)**
  - CRUD routes per §5; identity gate (loopback OR `Tailscale-User-Login` == configured owner); `python -m linkrelay mint --label …` prints the paste-ready `https://scshafe.github.io/hi/#k=<uuid>` URL
  - Verify: `./env/bin/python -m pytest tests/test_admin.py -q`

- [ ] **Step 7: Entrypoint serving both apps on 127.0.0.1:4100/4101 (§2)**
  - waitress, loopback binds only, one process
  - Verify: with the service running, `curl -s -o /dev/null -w '%{http_code}' localhost:4100/healthz` → 204, and `curl -s localhost:4101/admin/links` → JSON

- [ ] **Step 8: Adversarial review of the public surface before exposure**
  - Specialist: `doddy`
  - Scope: §4 routes, serializer, rate limiter, 404-oracle claim, header trust (forwarded IP, identity header spoofing via funnel)
  - Verify: human review — findings addressed or explicitly accepted in the design doc's §9 non-protections

- [ ] **Step 9: launchd service on the chosen host (§8)**
  - `com.cole.linkrelay.plist` with KeepAlive+RunAtLoad, logs to `~/Library/Logs/linkrelay/`
  - Verify: `launchctl kickstart -k gui/$(id -u)/com.cole.linkrelay && sleep 2 && curl -s -o /dev/null -w '%{http_code}' localhost:4100/healthz` → 204

- [ ] **Step 10: Tailscale prerequisites (§6)**
  - Rename machine to neutral name; enable MagicDNS + HTTPS certs; enable funnel node attribute
  - Verify: human review — `tailscale status` shows new name; `tailscale cert` succeeds

- [ ] **Step 11: Wire funnel (4100) and tailnet-only serve (4101) (§6)**
  - Flag syntax against current `tailscale serve --help`
  - Verify: `tailscale funnel status` lists exactly the 4100 target and nothing else; admin mapping appears only in `tailscale serve status`

- [ ] **Step 12: External verification matrix (§10)**
  - From cellular (off-tailnet): valid lookup 200 + click row; random UUID 404; `/admin/*` and 8443 unreachable. From tailnet: admin works.
  - Verify: human review against the §10 table, all rows pass

- [ ] **Step 13: blog-app `/hi` page (§7)**
  - `app/hi/page.tsx` + client token component (`#k=` then `?k=`, 2s abort, no-token = no fetch); add `"/hi"` to `RESERVED_VIEW_PATH_PREFIXES`; `NEXT_PUBLIC_LINK_API_BASE` env (empty disables)
  - Verify: `NEXT_PUBLIC_BUILD_MODE=publish npm run build` green AND `grep -L 'k=' .static-out/hi/index.html` confirms no token/personal data baked in

- [ ] **Step 14: End-to-end dry run with a test link**
  - Mint via CLI, publish site, click from phone on cellular, confirm personalized render + click row; stop service, click again, confirm clean default page
  - Verify: human review — both behaviors observed

- [ ] **Step 15: Retention job + docs + project entry (§8)**
  - Scheduled purge (launchd interval or admin-triggered), link-relay README, `blog-app/projects/link-relay.md` written per AGENT_GUIDE.md
  - Verify: `./env/bin/python -m pytest -q` all green AND `npm --prefix ~/personal/blog-app run projects:validate` passes

## Done criteria

All §10 matrix rows pass from an off-tailnet network; a real application link has been minted; both repos committed and pushed (`link-relay` main, blog-app main); live site republished with `/hi`.
