# SeferNote V1 production deployment — 28 September 2026

## Verified live state

- API container: `globepen-demo` running image `sefernote-v1:aab6edf` on `127.0.0.1:3081`, with the existing `/srv/globepen/shared/data:/data` mount and existing production environment. `GET /api/health` returns `product: SeferNote`.
- Caddy serves `/srv/globepen/releases/20260928-sefernote-v1-aab6edf/dist` on `app.ifyspace.tech`, `demo.ifyspace.tech`, and `devickys.ifyspace.tech`. The public page, API health, and public branding checks passed on all three hosts.
- Production Prisma migration status reported five applied migrations after `20260927000000_cbt_and_live_lessons` was applied. The original four-migration database was backed up with SQLite's online backup API after stopping writes; the backup passed `PRAGMA integrity_check`.
- The first release backup is `/srv/globepen/shared/backups/20260928-sefernote-v1-8006b1c/`; the onboarding hotfix backup is `/srv/globepen/shared/backups/20260928-sefernote-onboarding-aab6edf/`. Both contain a root-only SQLite snapshot and the prior Caddyfile.
- The previous SeferNote API container remains stopped as `globepen-demo-before-onboarding-aab6edf` with image `sefernote-v1:8006b1c`. The earlier GlobePen container remains stopped as `globepen-demo-before-sefernote-v1-8006b1c` with image `globepen-demo:20260927-f0b6552`. Their static releases remain in `/srv/globepen/releases/`.
- Candidate code passed 111 API tests, `npm run lint`, and `npm run build` in an isolated development workspace with a disposable database. The admin learning links and manual account-creation form passed browser checks at 1440px and 390px in light and dark modes.
- Fresh production-browser checks passed for all three public home pages and the DEVICKYS login at 1440px and 390px with no page errors or horizontal overflow. Unauthenticated `/api/auth/invite` returned 401; disabled `/api/auth/forgot-password` returned 503.

## Pilot operation and remaining limits

- `EMAIL_DELIVERY_MODE=disabled`. School admins should use **Portal Accounts** in the sidebar to invite a teacher or select an existing active pupil, then copy the single-use activation link from the success panel and give it privately to that person. The link expires after 48 hours. Email password recovery remains unavailable until SMTP is configured.
- CBT and external Google Meet/Zoom classroom APIs have automated coverage. A real teacher/pupil session with actual pilot accounts has not been exercised by this deployment operator; the school should test create/publish/take/grade CBT and schedule/start/join/end a lesson.
- Embedded LiveKit remains unconfigured. The current server code reads a single global LiveKit configuration; school-owned LiveKit accounts and separate school billing require a later per-tenant credential design and two-person media/capacity test.
- The DEVICKYS login title comes from the school's saved portal title (`DEVICKYS GEM SCHOOL Portal`), while the public landing page uses the saved school name (`DEVICKYS GEM SCHOOLS`). The school can adjust its portal title in branding settings if it wants those labels identical.

## Rollback boundary

The onboarding hotfix made no database migration. To revert only it, restore the Caddyfile from the onboarding backup and reload Caddy, then stop the current API container and restart the preserved `sefernote-v1:8006b1c` container on the same name and port. The fifth CBT/classroom migration is additive; the earlier GlobePen image can also run against the expanded schema if a wider application rollback is required. Preserve the current database and take a new consistent backup before any rollback involving live writes.

## DEVICKYS pilot update — 29 September 2026

- Integrated release commit: `8d19d1e` on `hermes/sefernote-v1-integrated`. It combines the UI and Registry work, with guarded term/session transitions, conservative JSS/SS promotion suggestions, accurate paged history, and school-scoped academic period refresh. `main` was not modified.
- Verification on an isolated copy with a disposable SQLite database: 121 tests passed; `npm run lint` and `npm run build` passed. The image `sefernote-v1:8d19d1e` started and returned a healthy response against a separate staging database.
- The shared API container `globepen-demo` now runs `sefernote-v1:8d19d1e` on `127.0.0.1:3081`. The previous container is preserved, stopped, as `globepen-demo-before-8d19d1e` with image `sefernote-v1:aab6edf`. No new database migration was required; the five existing migrations remain applied.
- Caddy serves the new static release at `/srv/globepen/releases/20260929-sefernote-v1-8d19d1e/dist` **only** for `devickys.ifyspace.tech`. The `app` and `demo` hosts continue to serve the prior static release. The API is shared by all three hosts, so this is a DEVICKYS-only interface rollout, not a separate backend deployment.
- A consistent SQLite snapshot and prior Caddyfile are stored root-only in `/srv/globepen/shared/backups/20260929-sefernote-v1-8d19d1e/`; the backup passed `PRAGMA integrity_check`. The old static release remains on disk. A production restore drill or off-server backup is not yet verified.
- Post-cutover: all three public API health checks succeeded; the DEVICKYS homepage matched the new release `index.html` exactly, while `app` and `demo` matched the old release; DEVICKYS tenant and school branding returned the expected school; the registry rejected an unauthenticated request with 401. Desktop public landing and mobile login rendered in a fresh headless Chrome profile. The new API container had zero restarts at the verification point.
- Authenticated school workflows (create/edit records, promotion Apply, CBT, and live lesson) have automated API coverage but were not clicked through against production accounts. The school should complete its own acceptance check. Embedded LiveKit still awaits school-owned credentials.
- Shared-origin multi-school browser data isolation remains a separate release blocker for extending this interface to `app.ifyspace.tech`. Removed registry mirrors that are referenced by older local academic work remain on that device to preserve that work.

Rollback for this update: restore the saved Caddyfile and reload Caddy, then stop/remove the current `globepen-demo` container, rename `globepen-demo-before-8d19d1e` back to `globepen-demo`, and start it. Take a fresh consistent database snapshot before rolling back after live writes; do not replace the live database with the pre-release snapshot unless a deliberate data recovery is required.
