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

## Focused review follow-up — landing page, portal branding, domain workflow

A review of the live-facing school pages, Settings > Identity, Settings > Portal & Domain and the imported-data screens found four defects. All were corrected without changing the database schema, the imported records or any tenant-isolation control.

- `src/pages/DevikysLandingPage.tsx` rendered a hard-coded logo, school name, motto and support email, so a logo or contact change saved in Settings never reached the landing page. It now renders `branding.logoUrl`, `schoolName`, `slogan` and `contactEmail`; the known school values remain only as fallbacks for a school that has not saved branding yet.
- `src/components/reportCard/ReportCard.tsx` and `src/components/settings/LivePreview.tsx` forced white text onto the school brand colour. With the live primary colour `#FFD700` that is white on gold, roughly 1.1:1 contrast. Both now derive readable text through the existing `brandContrast` helper, so the report preview, the printed report card and the login button agree.
- `src/components/settings/DomainBrandingManager.tsx` could still print `Verified on Invalid Date` when a domain was marked verified without a verification timestamp, and the verified branch of the pending-domain block was unreachable. The verified state is now a dedicated panel, shows the verification date only when the server supplies one, and states the remaining DNS routing and proxy/TLS step. `"Generating token..."` was replaced with an accurate message, because the server cannot mint a challenge on demand.
- Settings > Portal & Domain now states that the school name, motto, address, logo and primary colour live under Settings > Identity, so the two tabs are not mistaken for each other.

Verification after the review: 89 tests, `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass. No deployment was performed.

### Colour scope on the landing page

The saved primary and secondary colours drive the portal surfaces that have a contrast-safe mapping: the login page gradient and buttons, the sidebar, the dashboard blocks and the report preview/report card. The school's landing page keeps its own fixed dark presentation palette. Its accent colours are not re-themed from the saved brand colour because the page is a fixed dark theme, where an arbitrary saved colour (including the platform default of dark slate `#1E293B`) would render the call-to-action buttons invisible. Identity, logo, motto and contact details on that page are branding-driven.

