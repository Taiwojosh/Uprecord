# SeferNote pilot UX work board

Use this board with `AGENTS.md`. Work on an isolated branch and worktree for each task. Do not edit another owner's files or deploy to production. The current deployed version stays in place until changes are reviewed and a separate release is approved.

## Claim and handoff rules

1. Before coding, read this board and `AGENTS.md`, run `git status`, and claim one task by changing its status to **In progress** and recording your branch and name/tool in its task note. If the assigned owner is already working, do not edit those files.
2. To take over an unfinished task, write a handoff note in its task note: what is done, what remains, last passing checks, commit/branch, and **Taking over: name/tool**. Tell the former owner. The new owner must use a new branch or worktree; never share a working tree.
3. If blocked, mark **Blocked** and record the exact decision or failure needed. Pick another unclaimed task with different file ownership. Do not silently widen scope.
4. When ready, mark **Review**, link commit(s), and list `npm test`, `npm run lint`, `npm run build`, and desktop/mobile browser results as **VERIFIED**, **INFERRED**, or **NOT TESTED**. A different agent reviews production-sensitive code before merge.
5. Record attribution in the task note (`Implemented by`, `Reviewed by`) and Git commits. Do not add personal signatures or agent tags throughout source files.

## Tasks and boundaries

| ID | Owner | Status | Scope and acceptance | Primary file boundary |
| --- | --- | --- | --- | --- |
| SAFE-1 | Codex | Review | Label browser-only export accurately; prevent unscoped export and unsafe local restore/reset; require explicit confirmation before detaching a school domain. | `BackupPage.tsx`, `DomainBrandingManager.tsx`, `server/src/routes/schools.ts`, matching tests. |
| REG-1 | Cline | Available | One School Registry nav entry with Students/Teachers sections; keep old direct routes; term roster rollover preview for students and teachers; next-session promotion preview with exceptions; grouped history; classes/subjects flow into academic lists; derive school abbreviation only for new student numbers and preserve existing IDs. | `Sidebar.tsx`, registry/history/roster pages and their server routes/tests. Avoid `AppLayout.tsx`, `ImmersiveContext.tsx`, `LessonNotesPage.tsx`, `UserManualPage.tsx`, `BackupPage.tsx`, domain files. |
| UI-1 | Codex | In progress | Offline-only local-record notice; diagnose autosave flicker and use quiet saved feedback; consistent typography/spacing; mobile immersive default with proper header padding and Results-only control; smaller powered-by text; friction-free lesson planner; clear Help & Guide; define and simplify audit-log presentation. Verify desktop/mobile, light/dark, and school branding. | `AppLayout.tsx`, `ImmersiveContext.tsx`, `LessonNotesPage.tsx`, `UserManualPage.tsx`, `AuditPage.tsx`, shared CSS/components. Avoid `Sidebar.tsx`, registry/history pages, backup/domain files. |
| AUTH-1 | Unclaimed | Needs product decision | Existing school usernames/admission or staff IDs as login identifiers, one-time account setup, admin-assisted resets, no shared default passwords. Inspect imported identity mapping and tenant uniqueness before coding. | Auth, account creation, server schema/tests. |
| CBT-1 | Unclaimed | Needs product decision | Paste/import question text with detected options and required teacher confirmation; topic-based AI prompt template; evaluate teacher BYOK as a later secure feature. No key entry or billing UI yet. | CBT page/routes/tests. |
| LIVE-1 | Unclaimed | Planned | Platform-admin dashboard for per-school LiveKit URL/key/secret, connection test, secret encryption and redacted readback; existing global config may be a fallback until a school is configured. No browser storage of secrets. | Admin/live server routes, school settings schema, platform admin UI/tests. |
| RECOVERY-1 | Unclaimed | Planned | Design and test real server database backup, retention, off-server encrypted copies, and restore drill. Browser export is not server recovery. | Operator scripts/docs; no production DB used in development. |

## Task notes

### SAFE-1

- Branch: `hermes/sefernote-backup-domain-safety`
- Commit: `3a07dfc`
- Implemented by: Codex
- Reviewed by: pending independent review
- VERIFIED: 111 tests passed, `npm run lint` passed, `npm run build` exited successfully in isolated Linux workspace using only disposable test data.
- NOT TESTED: authenticated desktop/mobile browser flows on this branch; no production deployment.
- Handoff: none

### REG-1

- Branch: unclaimed
- Implemented by: pending
- Reviewed by: pending
- Handoff: none

### UI-1

- Branch: `hermes/ui1-takeover`
- Starting draft: Antigravity commit `6167f8e`; its worktree remains untouched.
- Implemented by: Antigravity (draft), Codex (takeover and corrections)
- Reviewed by: pending
- Handoff: Taking over: Codex, at the user's request. Remaining: correct sync/offline language, enforce mobile layout, investigate save flicker, repair guide claims, browser verification, tests, build, and review.

### AUTH-1 / CBT-1 / LIVE-1 / RECOVERY-1

- Branch: unclaimed
- Implemented by: pending
- Reviewed by: pending
- Handoff: none
