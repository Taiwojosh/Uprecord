# GlobePen design system — tokens and primitives

Additive layer on top of the existing Tailwind v4 setup in `src/index.css`.
No new runtime component library was installed; `clsx` + `tailwind-merge`
were already present and are used by `cn()` in `src/lib/utils.ts`.

## Token namespaces

| Namespace | Meaning | Owner |
| --- | --- | --- |
| `--app-*` | GlobePen platform chrome (page, surfaces, borders, text, actions, focus) | this file |
| `--brand-*` | School identity written at runtime by `BrandContext` (`--brand-primary/secondary/on-primary/on-secondary`) | `BrandContext.tsx` |
| `--color-school-*` | Tailwind semantic aliases for school surfaces (`bg-school-primary`, `text-on-school-primary`) | this file |
| `shadow-card`, `shadow-modal`, `radius-*` | Elevation and corner scales | this file |

Rules:
- Never derive *platform chrome* (buttons, focus rings, active states) from
  the school colour. School-branded surfaces use `--brand-*` only through the
  `--color-school-*` aliases, and text on them always uses
  `--color-on-school-*`, which `brandContrast()` guarantees readable.
- The old `--brand-accent/--brand-surface/--brand-border/--brand-muted` names
  remain only as aliases for existing renders; new code must use `--app-*`.

## Key tokens (light / dark)

- Page: `--app-bg` `#f8fafc` / `#020617`
- Surface: `--app-surface` `#ffffff` / `#0f172a`
- Hairline: `--app-border` `#e2e8f0` / `#1e293b`
- Body text: `--app-text` `#1e293b` / `#f8fafc`
- Focus ring: `--app-focus` `#2563eb` / `#7dd3fc` — constant, never
  school-derived, so keyboard focus stays visible for arbitrary school colours.

## Focus

- The legacy global `outline: none !important` reset was replaced by a single
  `:focus-visible` ring (3px `var(--app-focus)`, 2px offset) for inputs,
  buttons, selects, textareas, links, `[role="button"]` and `[tabindex]`.

## Primitives (`src/components/ui/`)

- `Button.tsx` — variants `default | secondary | outline | ghost | destructive
  | school | link`, sizes `sm | default | lg | icon`, `loading` state with
  `aria-busy`. `school` renders `--brand-primary`/`--brand-on-primary` for
  tenant-facing primary actions.
- `Card.tsx` — `Card / CardHeader / CardTitle / CardDescription /
  CardContent / CardFooter` on `--app-surface` + `--shadow-card`.
- `Field.tsx` — label + hint/error anatomy (`Field`), plus `Input`, `Select`
  and `Textarea` controls with `aria-invalid` and consistent focus/hover.
- `Alert.tsx` — `info | success | warning | danger` with icon and
  `role="alert"` (danger) / `role="status"` otherwise.
- `Skeleton.tsx` — single-line, form, table and card skeletons.
- `EmptyState.tsx` — upgraded (backwards compatible) with `title` and `action`.
- `Modal.tsx` — now `aria-labelledby`, `--app-surface` tokens, `z-[120]`.
- `ConfirmDialog.tsx` — now built on `Button` variants.

## Adopted in screens

App shell (skip link, page background tokens, sidebar `aria-label` + Escape
close), LoginPage, DashboardPage, RegistryPage, SchoolHistoryPage. Settings and
the report templates keep their existing styling for this pass.

## Verification

`npm test`, `npx tsc --noEmit`, `npm run build` pass with the tokens and
primitives in place. The built CSS is the source of truth for contrast; the
unit test `server/tests/brand-contrast.test.ts` pins `#FFD700 → #000000` and
`#111827 → #ffffff` for school text.