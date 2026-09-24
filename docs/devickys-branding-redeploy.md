# DEVICKYS reviewed frontend redeploy — 24 September 2026

Branch `codex/devickys-reviewed`, commit `819ce92`. No change was made to `main`.

## Scope

Frontend only. The reviewed commit touches four client files and one document;
`server/` and `prisma/` are byte-identical to the previously deployed commit, so
the API container, the database and the schema were not touched.

Files in the release: `src/pages/DevikysLandingPage.tsx`,
`src/components/reportCard/ReportCard.tsx`,
`src/components/settings/LivePreview.tsx`,
`src/components/settings/DomainBrandingManager.tsx`,
`docs/devickys-pilot-verification.md`.

## Deployment

- Release path: `/srv/globepen/releases/20260924-144313-reviewed`
- Served frontend root: `/srv/globepen/releases/20260924-144313-reviewed/dist`
- Bundle: `assets/index-BMPiJSir.js` (sha256 `f4bfedcb…`), `assets/index-BmyzIUmr.css`
- API container: `globepen-demo`, image `globepen-demo:20260924-reviewed` — **not rebuilt or restarted**, uptime unchanged. The running image already contains this server code.
- Caddy: only the three `root *` paths changed, from
  `/srv/globepen/releases/20260924-reviewed/dist` to the new path. The
  `reverse_proxy 127.0.0.1:3081` targets are unchanged. Config validated with
  `caddy validate --config` before reload.

## Rollback

- Previous frontend release (intact): `/srv/globepen/releases/20260924-reviewed`
- Caddyfile before this change: `/etc/caddy/Caddyfile.before-20260924-144622`, and a copy at `/srv/globepen/shared/backups/20260924-144313/Caddyfile`
- Database snapshot: `/srv/globepen/shared/backups/20260924-144313/globepen.db` (1,011,712 bytes, `PRAGMA integrity_check` = ok)
- Container definition: `/srv/globepen/shared/backups/20260924-144313/container.json`
- Rollback container retained: `globepen-demo-before-20260924-122454` (image `globepen-demo:20260923`)

Rollback of this release is a frontend repoint: set the three `root *` paths back
to `/srv/globepen/releases/20260924-reviewed/dist`, validate and reload Caddy.
The database was never written by this release, so no database restore is needed.

## Verification

| Check | Result |
| --- | --- |
| `npm test` | 89 passed (7 files) |
| `npx tsc --noEmit` / `npm run lint` | exit 0 |
| `npm run build` | built successfully |
| Build output audit | `dist` holds only `index.html`, `.js` and `.css`; no `.env`, `.db`, `.map`, backup JSON or credentials |
| `app.ifyspace.tech` `/` and `/login` | 200, certificate verified, serves `index-BMPiJSir.js` |
| `demo.ifyspace.tech` `/` and `/login` | 200, certificate verified, serves `index-BMPiJSir.js` |
| `devickys.ifyspace.tech` `/` and `/login` | 200, certificate verified, serves `index-BMPiJSir.js` |
| `/api/health` on all three hosts | `{"status":"ok","product":"GlobePen"}` |
| DEVICKYS branding API | `DEVICKYS GEM SCHOOL`, slug `devickys`, motto "Be of a Strong Will and Intellect", logo URL, `#FFD700`, `#111827`, `devickyscollege@gmail.com`, portal title `DEVICKYS GEM SCHOOL Portal` |
| Demo school isolation | separate school id, separate colours and title; platform host returns GlobePen defaults with `schoolId: null` |
| Unauthenticated `/api/registry`, `/api/registry/history`, `/api/schools/management`, `/api/students` | 401 |
| Unknown host and unverified domain reaching the API | 404 `Unrecognized host or unverified domain` |
| Unknown `*.ifyspace.tech` subdomain reaching the API | `School portal '…' does not exist.` |
| Live database | `integrity_check` ok; 117 students, 16 teacher profiles, 6 classes, 1,213 grades, 2,143 trait scores, 99 term attendance, 345 daily attendance, 1 import receipt — unchanged |
| Database file mtime | 12:39, before the 14:43 deployment — not written by this release |
| New bundle fixes present | `No active challenge. Save the domain again`, `Next step: point this domain`, `Settings > Identity` |
| Superseded text absent from new bundle | `Generating token...`, `Shining Brighter Every Day` |

The two superseded strings were confirmed present in the previously deployed
bundle and absent from the newly deployed one, so the delta is verified rather
than assumed.

## Remaining limitations

- Authenticated screens (Settings > Identity, Settings > Portal & Domain, the
  dashboard tiles) were verified at the API, data and bundle level. The pilot
  credentials are deliberately kept outside this repository, so no logged-in
  browser session was used.
- `devickysgemschools.com.ng` was not connected, as instructed.
- An unmatched hostname still receives an empty HTTP 200 from Caddy rather than a
  404, because Caddy returns an empty response when no site block matches. No
  school data is served and the request never reaches the API. This behaviour
  predates this release and was not changed.
- `caddy validate` reports a non-fatal Caddyfile formatting warning that also
  applied to the previous configuration. `caddy fmt` was not run, to avoid
  rewriting unrelated site blocks.
- Older academic editing screens still use browser-local storage; teacher
  activation and email recovery remain disabled; Historical Records remains
  read-only.
