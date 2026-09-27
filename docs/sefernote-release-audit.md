# SeferNote / DEVICKYS pilot release audit — 27 September 2026

## Verified

- The live DEVICKYS API health endpoint returns HTTP 200 and still identifies its product as `GlobePen`. The production container is `globepen-demo:20260927-f0b6552`; Caddy serves `/srv/globepen/releases/20260927-release/dist` for the platform and DEVICKYS hosts.
- The production container reports four applied migrations and an up-to-date schema **relative to that container**. Its image contains only the four migrations through `20260924123000_legacy_import_receipt`.
- `integration/globepen-next` at `f0b6552` contains the professional public landing page, report card refinements, and portal loading/recovery screens. These changes are included in candidate branch `codex/devickys-v1-learning`.
- The candidate adds `20260927000000_cbt_and_live_lessons` for server-backed CBT and class scheduling. It is not applied in production. The separate tenant backfill branch also has its own `20260926000000_tenant_backfill_fidelity` migration. Migration ordering and schema combination require review before production deployment.
- Candidate branch `71c5495` passed 109 of 109 API tests on a fresh disposable SQLite database in `/home/hermes/workspaces/sefernote-validation`, and TypeScript passed there. Its frontend build exited successfully on Windows in 1 minute 35 seconds. No production data was used for tests.
- New invitations now store an activation-token hash, and student invites require a linked active pupil in the same school. A test confirms no plaintext token is stored for new invites.

## Release gaps

- Embedded video uses LiveKit access tokens but has no configured LiveKit service, public video hostname, or two-person media test. The current 2-vCPU/8-GB VPS has about 5 GB available memory but capacity for a full class is unmeasured. Google Meet/Zoom links are the working V1 path when deployed.
- The DEVICKYS pilot needs at least one assigned teacher account and one activated pupil account for an end-to-end CBT/classroom trial. Imported pupil records alone do not create sign-in accounts.
- The SeferNote text, wordmark, SVG favicon, API branding and PWA metadata changed in the candidate. The existing raster install icons still show the older mark. The production site remains GlobePen until a reviewed release is deployed.
- The local Windows Prisma schema engine fails before tests begin. The isolated Linux test run passed, so the local failure is an environment issue rather than evidence of an application test failure.
- The candidate has not had an actual browser review of the new SeferNote UI at desktop/mobile sizes or a real multi-person video session. Do not certify visual or video readiness from build/tests alone.
- The tenant backfill importer remains on its own branch. Its migration adds unique keys to Subject and TraitDefinition; the documented duplicate preflight is needed before it can be combined with the learning release.

## Recommended release order

1. Agree the DEVICKYS pilot scope: external meeting links for today's live classroom, embedded video gated until a provider and capacity test are ready.
2. Review and combine the tenant-backfill and learning migrations on an isolated branch; rehearse them on a disposable database shaped like the schema, without production data.
3. Finish raster app icons and run desktop/mobile browser checks using the DEVICKYS school brand.
4. Prepare teacher and student activation links through the school admin flow, then test create/publish/take/grade CBT and schedule/start/join/end a live class with real pilot accounts.
5. Take a production SQLite backup, verify migration preflight and rollback, then deploy a versioned release and smoke-test the public, login, CBT and class routes.

This audit cannot show what Antigravity is doing inside its editor. It records repository and live-server state observed independently.
