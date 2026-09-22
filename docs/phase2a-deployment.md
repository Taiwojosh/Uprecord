# GlobePen school pilot deployment

This branch uses SQLite. The older PostgreSQL environment example did not match
the Prisma schema. These migrations do not convert databases to PostgreSQL.
Use one API instance with a persistent SQLite volume for the pilot.

## Database rollout

Stop writes and take a consistent database backup (including SQLite WAL state),
then rehearse the upgrade on a copy. Keep the prior application artifact.
Never run `db push`, `migrate reset`, or development migrations on production.

For an empty database, set DATABASE_URL and run:

Ensure its parent directory exists and is writable. On the tested Windows/Prisma
6.19.3 setup, the engine required the empty SQLite file to exist before deploy;
creating a new empty file resolved its otherwise blank schema-engine error.
Never overwrite an existing database to apply this workaround.

```sh
npx prisma migrate deploy
npx prisma generate
npx tsx server/src/scripts/backfillSlugs.ts
```

For an existing Phase 1 database without migration history, compare its schema
with `20260922000000_phase1_baseline/migration.sql` first. Only if it matches,
mark that baseline applied, then deploy the additive Phase 2 migration:

```sh
npx prisma migrate resolve --applied 20260922000000_phase1_baseline
npx prisma migrate deploy
npx prisma generate
npx tsx server/src/scripts/backfillSlugs.ts
```

The baseline is generated from commit bb9f1ae. An existing database already
updated by Antigravity's `db push` must be checked against the complete current
schema before marking BOTH migrations applied; do not execute the baseline over
existing tables. The backfill retains existing slugs and can be rerun.

Verify school/user counts, school membership and login, foreign-key integrity,
and branding after upgrading. Rollback means restoring the backup and prior
application together during maintenance; it is not deleting live slugs.

## Hostnames and HTTPS

Replace all `.example` values in the production environment with domains you own.
PLATFORM_HOSTS contains exact central portal hostnames; PLATFORM_BASE_DOMAINS
contains bases whose direct subdomains identify school slugs. Unknown hosts fail
closed. Configure wildcard DNS and TLS for the chosen base. Route the frontend
and `/api` on the same origin and preserve the original Host header.

TRUSTED_PROXIES defaults to false. If a reverse proxy is used, configure its
specific address/CIDR, restrict direct access to the API, and make the proxy
overwrite forwarded headers. Do not use an unrestricted `true` trust setting.
Do not publicly cache branding or authenticated responses across hostnames.

Register a custom domain in school Settings, publish the displayed TXT record,
and verify. Verification checks DNS ownership only. The operator must still
configure DNS routing, proxy virtual host, and a valid TLS certificate. Pending
domains never resolve a tenant. Domain replacement/removal invalidates old proof.

## Release gate

Run `npm test`, `npm run lint`, and `npm run build`. On staging, check two schools
with separate names/colors and admin accounts: fresh-browser settings, branding
save/reload, wrong-school login rejection, pending domain reload, real TXT proof,
and final HTTPS routing. Superadmins must use a platform hostname.
