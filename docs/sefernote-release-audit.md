# SeferNote / DEVICKYS pilot release audit — 28 September 2026

## Verified

- The live DEVICKYS API health endpoint returns HTTP 200 and still identifies its product as `GlobePen`. The production container is `globepen-demo:20260927-f0b6552`; Caddy serves `/srv/globepen/releases/20260927-release/dist` for the platform and DEVICKYS hosts.
- The production container reports four applied migrations and an up-to-date schema **relative to that container**. Its image contains only the four migrations through `20260924123000_legacy_import_receipt`.
- `integration/globepen-next` at `f0b6552` contains the professional public landing page, report card refinements, and portal loading/recovery screens. These changes are included in candidate branch `codex/devickys-v1-learning`.
- The learning candidate adds `20260927000000_cbt_and_live_lessons` for server-backed CBT and class scheduling. It is not applied in production. A disposable SQLite database was upgraded from the four current migrations to this fifth migration; Prisma reported all five applied and the schema up to date. No production data was used.
- Release-readiness code commit `68bd19d` passed all 110 API tests, `npm run lint` (`tsc --noEmit`), and `npm run build` in an isolated clean extraction at `/home/hermes/workspaces/sefernote-release-verify-68bd19d`. The build exited successfully with non-blocking bundle-size warnings. The local and pushed branch refs matched at this commit. No production data was used.
- New invitations now store an activation-token hash, and student invites require a linked active pupil in the same school. A test confirms no plaintext token is stored for new invites.
- A headless Chromium check of the built candidate rendered the platform and DEVICKYS landing pages at 1440px and 390px, in light and dark modes, and the DEVICKYS login at both widths. There were no page errors or horizontal overflows, and the school mobile menu opened. The check used a synthetic branding response and unauthenticated routes; it did not exercise real accounts. A screenshot review exposed dark headings on the school's dark site; `hermes/sefernote-release-readiness` fixes their contrast and the built page was rechecked.

## Release gaps

- Embedded video uses LiveKit access tokens but has no configured LiveKit service, public video hostname, or two-person media test. The current 2-vCPU/8-GB VPS has unmeasured capacity for a full class. Google Meet/Zoom links are the V1 pilot path when deployed; do not advertise embedded video as live-ready.
- The DEVICKYS pilot needs at least one assigned teacher account and one activated pupil account for an end-to-end CBT/classroom trial. Imported pupil records alone do not create sign-in accounts.
- The SeferNote text, wordmark, SVG favicon, raster install icons, API branding, email templates and PWA metadata changed in the candidate. The production site remains GlobePen until a reviewed release is deployed.
- The local Windows Prisma schema engine fails before tests begin. The isolated Linux test run passed, so the local failure is an environment issue rather than evidence of an application test failure.
- Authenticated CBT and classroom flows still need a real teacher and pupil pilot check; the browser pass covered public and login routes only. A real multi-person video session was not tested.
- The tenant backfill importer remains on its own branch. DEVICKYS already has a server roster; that importer assumes first-time import and its migration adds unique keys to Subject and TraitDefinition. Do not combine it into this V1 release without a separate, populated-tenant reconciliation and duplicate preflight.

## Recommended release order

1. Independently review the final diff and migration before rollout. Production deployment is a separate user action under `AGENTS.md`.
3. At rollout, stop writes, take a verified consistent SQLite backup, preserve the current container image and static release, apply only the fifth CBT/classroom migration, and publish the matching API image and static assets as one versioned release. Keep rollback paths ready. Do not run tests against production data.
4. Smoke-check all three hosts, DEVICKYS branding/login, API health, CBT/classroom routes, and static file permissions. Use school-admin invitations to activate one assigned teacher and one pupil, then test create/publish/take/grade CBT and schedule/start/join/end a class with an external meeting link.
5. Configure LiveKit and run a two-person media/capacity test before enabling embedded classroom sessions.

This audit cannot show what Antigravity is doing inside its editor. It records repository and live-server state observed independently.
