# GlobePen browser acceptance pass — 25 September 2026

Scope: final acceptance of the UI-refinement branch (`codex/devickys-reviewed`)
against a **local** instance of the production build (Vite `dist`), served on
`http://127.0.0.1:3000` with `/api` reverse-proxied to a local GlobePen API on
`:3002` backed by a throwaway SQLite dev database. Playwright Chromium drove a
real browser: desktop 1440×900 and mobile 390×844, light and dark, normal
navigation and refresh. No production service, database or deployment was
touched.

Screenshots: `C:/Users/Ifeoluwa/AppData/Local/Temp/shots/` (38 PNGs).

## Routes and viewports inspected

| Screen | Desktop | Mobile | Dark |
| --- | :-: | :-: | :-: |
| Platform landing (`/`) | ✔ | — | — |
| Login (DEVICKYS interception) | ✔ | — | — |
| App shell / sidebar / header | ✔ | ✔ (drawer) | ✔ |
| Dashboard | ✔ | ✔ | ✔ |
| School Registry (classes/students/teachers) | ✔ | ✔ | ✔ |
| Historical Records + empty search | ✔ | ✔ | ✔ |
| Settings — Identity | ✔ | — | ✔ |
| Settings — Portal & Domain (verified-domain panel) | ✔ | — | — |
| Report preview (LivePreview) | ✔ | — | — |
| CommunicationPage + Messages availability | ✔ | ✔ | — |
| Students add-modal (focus + Escape) | ✔ | — | — |
| DEVICKYS white-label portal | ✔ | ✔ | ✔ |
| Demo school (isolation) | ✔ | — | — |
| Platform admin panel (`/admin-panel`, superadmin) | ✔ | — | — |

Also refreshed every route (hard reload) — branding persisted correctly across
reloads (school vars re-applied by `BrandContext`).

## White-label evidence (measured in-browser)

- DEVICKYS: `--brand-primary #FFD700`, `--brand-secondary #111827`,
  `--brand-on-primary #000000` (black on gold), sidebar `rgb(17,24,39)`, active
  nav chip `rgb(255,215,0)`; login page gradient
  `linear-gradient(145deg, #111827, #FFD700)` and portal title
  “DEVICKYS GEM SCHOOL Portal”.
- Demo: `#2563eb / #0d9488 / #ffffff`, teal sidebar, blue active chip — no
  cross-school bleed; demo registry correctly empty (0 records).
- Platform host: GlobePen defaults, no `school-portal`.
- Platform chrome (`--app-*`) remains separate from school identity
  (`--brand-*`, `--color-school-*`).

## Accessibility (real keyboard interaction)

- **Tab focus visible at every stop**: 10-stop walk on the Dashboard shell —
  skip link, Dashboard, School Registry, Historical Records, Students,
  Teachers, Classes, Subjects, Results, Lesson Planner — each reported
  `outline: solid 3px` (the new global `:focus-visible`).
- Skip-to-content: first Tab focuses “Skip to main content” → Enter jumps to
  main content.
- Sidebar navigation reached fully by keyboard; active state uses
  `aria-current="page"`.
- Mobile drawer: opens via “Open menu”, **Escape closes it** (overlay aside
  returns off-canvas).
- Modal (`/students` add): `role="dialog"`, `aria-modal`, `aria-labelledby`
  present; Escape closes.
- Forms: Registry and History fields expose `<label for>`, hint/error
  `aria-describedby`, `aria-invalid` on error state.
- No focus trap found (10-step walk had no cycle); no interactive control
  depends only on hover (all actions are buttons/links).
- Historical Records table: `<caption>` + `scope="col"` on all five columns.

## Console and network (captured for every page in both runs)

- 0 console errors; 0 React/Vite runtime errors; 0 failed/failed-response
  network requests.
- One expected 429 during the second probe run: the API **login rate limiter**
  (5 attempts / account / 15 min, in-memory) correctly blocked a flood of
  automated logins — security control behaving as designed, not a UI defect.

## Visual design checks

- Spacing/overflow: no horizontal overflow on any route at either viewport
  (documented `overflow-x-auto` table wrapper on History behaves correctly).
- Light/dark: Dashboard, Registry, Settings render in dark with correct tokens
  and no overflow; school colours unchanged in dark mode.
- Loading/empty/error states: History skeleton load, empty-search EmptyState,
  Dashboard count skeletons, Registry skeleton + empty state, demo-school empty
  registry all render.
- Report preview (LivePreview) renders the school brand header with black text
  on gold (the `#FFD700` contrast fix); no clipping.
- CommunicationPage (`bc4b39e` review): two-section tabs highlight correctly,
  tokens used (`bg-primary`, `text-muted-foreground`, `bg-surface`), messages
  availability panel is honest (“not available yet”), mobile layout fine,
  navigation entry resolves and highlight state is correct.

## Findings requiring code change

None demonstrated. Two non-code observations, both expected:
1. A momentary post-login frame can use platform defaults until
   `/schools/identity` resolves (sub-second; correct values confirmed at
   settle). Purely cosmetic; left unchanged (would touch bootstrap order).
2. The global `!important` spacing/radius caps and blue-to-crimson remaps were
   not regressed or removed — removing them safely is the documented follow-up
   (`docs/ui-audit.md`), not part of this pass.

## Validation

`npm test` 89 passed · `npx tsc --noEmit` exit 0 · `npm run build` success on
the final committed tree. No source changes were produced by this pass, so the
previously recorded gate results stand (re-verified after cleanup).

Commit on `codex/devickys-reviewed`. Waiting on: nothing product blocking.