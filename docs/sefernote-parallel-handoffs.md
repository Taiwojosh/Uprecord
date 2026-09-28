# SeferNote V1 handoffs — 28 September 2026

These are independent, read-only tasks for Antigravity and Cline. Candidate branch: `hermes/sefernote-release-readiness` (code commit `68bd19d`). Its 110 tests, TypeScript check, and production build pass. Production still runs `globepen-demo:20260927-f0b6552` with four migrations; the candidate adds `20260927000000_cbt_and_live_lessons`.

## Antigravity — independent release review

Review `hermes/sefernote-release-readiness` against the deployed `f0b6552` release. Focus on migration safety, tenant isolation, teacher/student permissions for CBT and live lessons, invitation security, Caddy/API/static deployment order, and rollback. Check that the current four-migration database can take only the fifth CBT/live migration. Do not merge `cline/tenant-backfill-foundation` into this release: its importer assumes a first-time school import, while DEVICKYS already has a server roster, and its uniqueness migration needs a separate populated-tenant audit. Report actionable findings with file and line references and state whether the candidate is safe for a versioned rollout. Do not deploy or modify production; `AGENTS.md` requires a separate user deployment action.

## Cline — pilot usability and acceptance check

Use an isolated checkout of `hermes/sefernote-release-readiness`. Exercise the DEVICKYS site and login at desktop and phone widths, then the teacher and pupil V1 journey using disposable accounts/data: teacher creates and publishes a timed CBT; pupil sees only their class's test, submits once, and sees the permitted result; teacher sees results; teacher schedules, starts, and ends a live lesson with an external Meet/Zoom link; pupil joins only their class's session. Record each failed step, screenshot or exact error, and number of clicks. Suggest the smallest UX fixes in a separate branch only if needed. Do not use production student records or edit the release-readiness branch. Embedded LiveKit remains gated until a provider and two-person capacity test exist.
