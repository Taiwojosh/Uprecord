# GlobePen — Agent Boundaries, Security Invariants & Worktree Rules

All AI coding agents (Cline, Gemini/Antigravity, and Hermes agents) working on the GlobePen codebase must strictly comply with the rules in this document.

---

## 1. Branch Ownership & Concurrency Rules

1. **`main` is protected**: Never commit, rebase, or merge directly to `main` without explicit user instruction.
2. **`codex/hermes-baseline` is immutable**: This branch serves as the canonical starting baseline for Hermes. Never implement feature code directly on `codex/hermes-baseline`.
3. **Use isolated task branches and worktrees**:
   - Every Hermes coding task must use its own dedicated task branch and worktree: `hermes/<task-name>`.
   - Never allow multiple agents to modify the same working tree simultaneously.
4. **Never overwrite concurrent work**:
   - Always run `git status` and `git branch --show-current` before modifying files.
   - Never reset, stash, or delete uncommitted work belonging to another agent or task.
5. **The root checkout (`feature/globepen-school-pilot`) is quarantined**:
   - Do NOT commit, stage, reset, or build from `C:/Users/Ifeoluwa/GitHub Projets/Uprecord`.
   - It contains legacy divergent work and uncommitted raw school data that will be reconciled separately.

---

## 2. Multi-Tenancy & Security Invariants (Non-Negotiable)

1. **Server-Side Tenant Enforcement**:
   - Never trust a client-supplied `schoolId`, query parameter, or header as authorization.
   - School tenancy must always be resolved server-side from the authenticated session and trusted hostname resolution (`req.resolvedSchool`).
2. **Cross-School Data Isolation**:
   - Never allow one school's users or administrators to view, query, or mutate another school's records.
   - Ensure all database queries and report generation pathways are explicitly scoped by `schoolId`.
3. **Authentication & Session Security**:
   - Never weaken password hashing, JWT/session cookie validation, session revocation, CSRF protection, or rate limiting.
   - Superadmin users must not authenticate through tenant-scoped school portal login forms.
4. **Zero Secret & Data Leakage**:
   - Never commit `.env` files, production credentials, JWT secrets, raw SQLite databases, or raw student/school backup files (`*.json`).
   - Never log plain credentials, private tokens, or unmasked personal identifiers.

---

## 3. PWA & Service Worker Caching Rules

1. **Strict `/api/*` Exemption**:
   - The service worker (`public/sw.js`) must **NEVER** intercept or cache any `/api/*` requests.
   - Authenticated student records, grades, teacher rosters, registry data, and session states must remain 100% network-driven to guarantee zero cross-school cache contamination.
2. **Static-Only Launch Cache**:
   - Only same-origin static launch assets (Vite-hashed JS/CSS, web fonts, platform icons, `/offline.html`) may be cached.
3. **Network-First Navigation**:
   - Shell navigation requests must be network-first so online users always receive the newest shell, falling back to `/offline.html` only when completely offline.
4. **Tenant-Safe Dynamic Manifest**:
   - Dynamic school portal install manifests (`GET /api/schools/manifest`) must resolve tenancy strictly server-side and be served with `Cache-Control: no-store`.

---

## 4. Production & Environment Boundaries

1. **Production is strictly isolated**:
   - Production lives at `/srv/globepen/...` on the VPS.
   - Never use `/srv/globepen` or any production release directory as a development workspace.
   - Hermes development takes place in a dedicated directory: `/home/hermes/workspaces/globepen`.
2. **No Production Database for Development**:
   - Never mutate, query, or copy the production SQLite database for development or automated testing.
   - Development and CI tests must use local, disposable SQLite databases and fixtures.
3. **No Automatic Deployments**:
   - Deployment to production is a deliberate, separate user action. Never deploy automatically.

---

## 5. Quality Gates & Verification Standards

Before declaring any task complete, agents must verify:
1. **Automated Test Suite**: `npm test` passes cleanly with zero failures.
2. **Type Safety**: `npx tsc --noEmit` passes with zero compiler errors.
3. **Production Build**: `npm run build` completes successfully.
4. **Browser Verification**: Responsive UI changes must be verified across desktop and mobile viewports, including light and dark modes, with active school brand tokens.

---

## 6. Escalation Protocol: QUESTION FOR CHATGPT

If an instruction is ambiguous or contradictory, and could affect Git history, production, tenant isolation, database schema, secrets, or domain routing:

**STOP IMMEDIATELY.** Do not guess or take a destructive path.

Format the question exactly as follows:

```text
QUESTION FOR CHATGPT

1. What I am trying to do:
2. What I found in the repository:
3. What is ambiguous or conflicting:
4. Files/branches/commits involved:
5. Possible options:
6. Which option I currently think is safest and why:
7. What I have NOT changed while waiting:
```
