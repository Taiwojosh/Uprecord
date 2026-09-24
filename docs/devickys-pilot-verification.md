# DEVICKYS pilot verification — 24 September 2026

Live portal: https://devickys.ifyspace.tech/

## Delivered
- Original school identity adapted into the landing page; school logo and saved colors on login and workspace.
- School-scoped shared registry and read-only historical records, with server-side authorization and cross-school checks.
- June 8 ScholarSync roster merged with April 22 Kardian academic history. Original private backups retained.
- Imported 117 students, 16 pending-activation teacher profiles, 6 classes, 1,213 grades, 2,143 trait scores, 99 term attendance records and 345 daily attendance records.
- Eleven April grades referenced students absent from both rosters; retained in the private source backup, not attached to other pupils. Legacy credentials were not imported.
- Import receipt prevents duplicate imports. Database backup and previous container retained for rollback.

## Verification
89 tests passed; TypeScript and production build passed. Live API checks covered fresh-session persistence, registry CRUD, foreign-school denial, logout revocation and disabled email delivery. Temporary verification records were removed.
Browser verified school landing, logo, sign-in, dashboard counts, historical result count and editable branding controls. Final visual check corrected misleading DNS instructions on already verified domains.

## Operational details
Release: /srv/globepen/releases/20260924-reviewed
Image: globepen-demo:20260924-reviewed
Backup: /srv/globepen/shared/backups/20260924-122454
Rollback container: globepen-demo-before-20260924-122454
Private import report: /srv/globepen/shared/imports/import-report.json
Credentials are in the local private pilot access document, not this repository.

## Remaining scope
Older academic editing screens still use browser-local storage; use School Registry for shared records and Historical Records for imported history. Email activation/recovery is disabled pending mail configuration. Teacher profiles do not yet have active login credentials. The example devickysgemschools.com.ng domain has not been connected. A school-owned domain requires ownership verification and proxy/TLS setup.

No changes were made to main. Work is on codex/devickys-reviewed.
