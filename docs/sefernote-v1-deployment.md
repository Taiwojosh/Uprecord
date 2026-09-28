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
