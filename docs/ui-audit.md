# GlobePen UI/UX audit — inventory-based review

Scope: 114 source files (`src/**/*.{ts,tsx,css}`). Counts below come from a
mechanical scan of the current tree, so the findings are evidence, not taste.
Screens were also read file-by-file. No behaviour, contract, schema, import or
deployment change is proposed here.

## 1. Visual hierarchy

- 23 pages use `<PageHeader>` (icon square + title + subtitle + optional
  actions), but 12 page-level `<main>` blocks and 6 raw `<header>` blocks
  remain hand-rolled, so headers differ in icon treatment, subtitle size and
  action placement.
- `PageHeader` uses `mb-8`, which the global stylesheet clamps to ~28px on
  desktop. Written spacing is not rendered spacing (see §3).
- `PageHeader`'s icon tint uses `text-primary`, which currently resolves to
  the *school* brand colour — platform chrome that silently changes meaning
  per tenant, and is low-contrast on white when the colour is light gold.

## 2. Typography

- Inter is loaded and `body` defaults to 14px, with `h1/h2/h3` base sizes. But
  the tree contains ~1,600 arbitrary sizes: `text-[Npx]` ×879 and
  `text-[0.NNNNrem]` ×721 (`text-[0.625rem]`, `text-[0.5625rem]`, …).
- There is no type scale. `font-black`, `font-extrabold`, `font-bold` and
  `font-semibold` are used interchangeably at the same sizes, and
  letter-spacing utilities are one-off.

## 3. Spacing and alignment

- `p-10` ×61, `p-8` ×123 and `space-y-8` ×66 are overridden in `index.css`
  with `!important` to smaller responsive values. `rounded-[2.5rem]/[2rem]/
  [3rem]` ×177 are capped to `1rem/1.25rem`. So a shadow spacing/radius
  system fights Tailwind: what you write is not what renders, and fixing a
  real `p-8` elsewhere requires another `!important`.
- `border-slate-200/100` and `border-gray-100/200` are forced to a
  translucent hairline globally — same mechanism, same trap for new screens.
- Hardcoded pixel geometry sits in the shell: the global search `<input>`
  carries `style={{ height: '30px', width: '381.766px' }}`; sidebar is
  `w-60`/`15rem` with school-name truncation at `max-w-[220px]`. Workable
  but brittle at intermediate widths.

## 4. Colours and contrast

- Two neutral scales are mixed everywhere: `text-gray-*` ×942 and
  `text-slate-*` ×678 in the same screens.
- `bg-blue-*` ×206 and `bg-indigo-*` ×49 do **not** render blue: the theme
  maps the blue/indigo scales to crimson and slate. Code says "blue", pixels
  say "red/dark". That layer also lets the school-portal override turn
  `.bg-blue-600/.bg-blue-700/.bg-indigo-600/.bg-blue-950` into the school
  primary — a working white-label feature built on a confusing name.
- 124 hardcoded six-digit hex colours sit in TSX, bypassing every token.
- `--brand-primary` has **two meanings**: `:root` defines it as platform
  slate `#1e293b`, and `BrandContext` overwrites it at runtime with the
  school colour. The `--brand-accent/--brand-surface/--brand-border/
  --brand-muted` set is a *different* "brand" (platform theme). Platform and
  school branding share one namespace — that collision is a defect.
- Working and must survive: the school-token quartet plus `.school-portal`
  scoping, honour-local → server-backed identity sync, logo initials
  fallback, contrast-safe text via `brandContrast()`, the login
  gradient/text driven by saved colours.

## 5. Sidebar and header consistency

- Sidebar is hard-dark with a `Logo` header, grouped nav, uppercase group
  labels, an active indicator fed by `border-[var(--brand-primary)]`, and a
  footer user chip + logout. Good bones. Gaps: nav items have no visible
  `:focus-visible` state (focus is globally removed, §10); desktop sidebar
  (motion width animation) and mobile sidebar (fixed + overlay) are two
  parallel implementations; the overlay has no `role="dialog"`/`aria-label`
  and no Escape handling.
- Header packs: mobile menu button, school identifier, global search with a
  custom results dropdown, theme toggle, immersive toggle. Gaps: search input
  fixed at `381.766px`; identifier hidden below `sm` so small screens lose
  school context; icon buttons rely on `title=` only.
- A second logout path exists in the header user menu beside the sidebar
  logout.

## 6. Buttons and forms

- No shared `Button`/`Input`/`Field`. Screens hand-roll paddings (`px-4
  py-3`, `px-5 py-2.5`, `px-6 py-3`), radii (`rounded-lg/xl/2xl`) and colours
  (`bg-blue-700`, `bg-emerald-600`, `bg-rose-600`, `bg-slate-900`), so two
  "primary" buttons on adjacent screens differ. `Spinner` defaults to
  `text-blue-600`. `ConfirmDialog` is fine, but destructive actions elsewhere
  use ad-hoc red buttons inside generic `Modal`.
- Form inputs are bare (`border border-slate-300 rounded-xl p-3`) with no
  shared label/hint/error anatomy, no consistent `aria-describedby`, and no
  visible focus ring anywhere by construction.

## 7. Table usability

- 25 `<table>`s but only 1 `<caption>` and 0 `<th scope=>`. The Historical
  Records table is raw (`p-3 border-b`, no sticky header, no hover row, no
  empty-state component, numeric/date columns left-aligned). The page does
  paginate and search honestly — the data layer is sound; the table chrome
  is not. Registry uses record cards, which read well and should stay cards.

## 8. Loading, empty and error states

- `Spinner` is used 32×, but many screens show raw text (`Loading registry…`)
  or unstyled `aria-busy` paragraphs (only 4 `aria-busy` attributes exist).
- `EmptyState` (14 uses) accepts only `icon`+`message` — no title, no action
  — so empty states dead-end instead of guiding the next step.
- `role="alert"` appears 7×; several error paragraphs are unstyled. The axios
  401 interceptor hard-navigates to `/login`, which can swallow in-page error
  context — behaviour is out of scope here, but error surfaces should not
  rely on it.

## 9. Responsive and mobile

- Breakpoint utilities are used, but the shell has fixed geometry (search
  `381.766px`, sidebar `240px`, truncations at `220px`) and stacking at
  `z-[9999]`/`z-[99999]` (FAB) above `z-[100]` (Modal). History's table
  scrolls (`overflow-x-auto` present) but has no sticky first column. Touch
  targets on icon-only buttons (`p-1.5`) sit under 40px.

## 10. Accessibility — the critical section

- **Zero visible keyboard focus anywhere.** `index.css` applies
  `outline: none !important` to every interactive element, and a codebase
  search finds **no real `focus-visible` styles** (the only
  `focus-visible`-matching string is a tooltip text literal, not a style).
  Tab users get no indication.
- Search forms (`focus:ring-4 focus:ring-blue-500/10`) provide a faint glow,
  but the global outline reset dominates and rings remain inconsistent.
- 14 `aria-label`, 2 `sr-only`. Icon-only buttons exist in the header, the
  FAB, table row actions (`Edit`/`Delete` use text, good) and modals (close
  button labelled, good).
- `Modal` has `role="dialog"` + `aria-modal` + Escape + scroll-lock (good)
  but no `aria-labelledby`/`aria-describedby` and no focus move/trap.
- No skip link; page `<main>` landmarks exist on most screens.
- Contrast already fixed for white-on-brand in report surfaces; the LoginPage
  button uses `--brand-on-primary` (good). Remaining risk is `text-primary`
  resolving to light school gold on white surfaces.

## 11. DEVICKYS white-label behaviour

- Working and must be preserved: runtime school tokens, `school-portal`
  scoping, server-backed identity sync, logo initials fallback, contrast-safe
  text, verified-domain panel, login gradient/text driven by saved colours.
- To repair: separate the platform token namespace from the school
  namespace; stop deriving *platform* chrome (`text-primary` icons, focus
  rings, active states) from the school colour — derive only
  *school-branded* surfaces from it, always through the contrast helper.
  Keep the Devikys landing page's own dark palette (documented decision).

## 12. Duplicated or conflicting patterns

- `!important` utility overrides (46 in CSS): padding, spacing, radius,
  hairline borders. They cap a bubbly legacy aesthetic but make the scale
  dishonest.
- Dark-mode blanket remaps (`.dark .bg-white → slate-900`, dozens of text
  remaps) instead of semantic tokens. Components are authored light and
  patched dark by brute force; any new screen inherits undocumented
  behaviour.
- Deep positional selectors (`div#root:nth-of-type(1) >
  div:nth-of-type(1) > div:nth-of-type(3) …`) force near-black icon/text
  colours in dark mode. They target an obsolete DOM and are brittle beyond
  use — remove or replace with component-owned styles.
- Two neutrals (`gray` vs `slate`), two radius families, four button radius
  sizes, and a private motion vocabulary (`transition-all` ×451) with no
  reduced-motion handling beyond Tailwind defaults.

## Refine in this order

1. Token layer (`src/index.css`) + `:focus-visible` + namespace separation.
2. Primitives: `Button`, `Card`, `Field` (input/select/textarea + label +
   hint/error), `Alert`, `Skeleton`, `Table` shell, `EmptyState` upgrade
   (backwards compatible), `Modal` labelling/focus-start.
3. Shell: header search geometry, sidebar focus states, overlay dialog
   semantics, page-content rhythm.
4. Login → Devikys landing → Dashboard → Registry → Settings & branding →
   Historical Records → report preview, in that order, using the primitives.

Each group gates on `npm test`, `npx tsc --noEmit`, `npm run build`.
Visual verification is by built-CSS token assertions and
`react-dom/server` structural checks, because no headed browser is available
in this environment.

