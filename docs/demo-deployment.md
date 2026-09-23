# ifyspace.tech demo release — 23 September 2026

Release branch: `codex/globepen-demo-release`. Main and the school-pilot working
checkout were not changed. This release includes Antigravity's authentication
corrections plus removal of the public development mail-capture endpoint,
escaped HTML email values, early environment loading, and explicit disabled-mail
behavior. No SuperTokens service was added.

## Running services

- VPS: 76.13.156.131, SSH alias `vps`.
- Application: Docker container `globepen-demo`, image `globepen-demo:20260923`.
- API is bound only to `127.0.0.1:3081`; Caddy provides public HTTPS.
- Frontend: `/srv/globepen/releases/20260923-demo/dist`.
- Persistent database: `/srv/globepen/shared/data/globepen.db`.
- Private runtime configuration: `/srv/globepen/shared/demo.env`.
- Private generated account details: `/srv/globepen/shared/data/demo-access.json`.
- Caddy backup: `/srv/globepen/shared/Caddyfile.before-demo`.

The demo uses a new, separate database with a fictional school and administrator,
teacher and platform-owner accounts. It does not contain imported real student
records. Existing VPS applications remain configured.

## DNS required

Add A records `app` and `demo`, both pointing to `76.13.156.131`, in the
ifyspace.tech DNS zone. Leave the root-domain record unchanged. Caddy is configured
for these two hosts and will obtain certificates when authoritative DNS resolves
correctly and ports 80/443 can reach the VPS. Check both certificates and browser
flows before describing the public demo as live.

Expected URLs:

- `https://app.ifyspace.tech/login` — main portal
- `https://demo.ifyspace.tech/login` — school portal
- `https://app.ifyspace.tech/admin-panel` — platform owner

## Email and scope

`EMAIL_DELIVERY_MODE=disabled` deliberately disables invitations and recovery
before database writes. The recovery page shows an unavailable message; no email
delivery is simulated. To enable email, configure SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASS and a verified SMTP_FROM, set EMAIL_DELIVERY_MODE to `smtp`, and recreate
the container using the updated environment file. Test delivery before inviting
users. Do not put secrets in frontend build variables.

This release demonstrates the existing school portal and authentication. Teacher
BYOK AI, CBT and live video classroom features have not been implemented in this
release. Several existing academic screens still store records in the browser's
local database; this is not a claim of complete cross-device academic-data sync.

## Verification

Clean dependency installation in an isolated Node 22 container on the VPS.
83 tests passed in five files; TypeScript passed; Vite build passed in 21.97s.
Three SQLite migrations applied to the new demo database. Live API tests verified
admin, teacher and platform-owner login, session validation and logout revocation.
Unknown hostnames are rejected, email is explicitly disabled, and the mail-capture
URL is unavailable. Public DNS/TLS and browser verification remained pending when
this note was prepared. Build warnings about bundle size remain non-fatal.

## Operations

Use `docker logs globepen-demo` and `docker inspect globepen-demo` to diagnose the
service. Never print demo.env or captured email links into logs. Back up the SQLite
database consistently before updates. Keep this demo data separate from any
future real-school rollout. Do not run the test suite against the live database.

Rollback/remove this new demo by stopping only `globepen-demo`, preserving its
data directory, removing only its two site blocks from Caddy, validating the
configuration and reloading Caddy. Preserve unrelated site configuration.
