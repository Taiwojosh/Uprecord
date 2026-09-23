# GlobePen Native Authentication Hardening: Deployment, Maintenance & Rollback Guide

This guide details the maintenance window procedure, additive schema migration, token backfill, forced re-login semantics, rollback handling, and configuration for GlobePen Phase 2 native authentication hardening.

---

## 1. Executive Summary & Security Objectives

This release hardens GlobePen's native authentication without external dependencies (SuperTokens deferred):
- **Server-Side Session Revocation**: Every user has a database-backed `tokenVersion`. Logout, password changes, or account suspensions immediately revoke active sessions across all devices.
- **Double-Submit CSRF**: Enforced on all cookie-authenticated state-modifying requests; Bearer tokens cannot bypass CSRF when session cookies are ambient.
- **Token Hashing & Atomic Consumption**: Password setup and reset tokens are hashed with SHA-256 and conditionally consumed in single-statement transactions to prevent race conditions and concurrent reuse.
- **Strict Rate-Limiting**: Enforces IP and account sliding-window limits with a hard memory cap and LRU eviction.
- **Real SMTP Transport**: Outbound recovery emails use validated SMTP transports in production with full error redaction. In development/testing, an in-memory ring buffer captures messages without logging tokens to console.

---

## 2. Maintenance Window Deployment Procedure

For this pilot release, use a scheduled maintenance window to ensure data consistency during token migration and session rotation:

```
[1. Stop Auth Writes] ──> [2. DB Backup] ──> [3. Schema Migration] ──> [4. Token Backfill]
                                                                              │
[8. Reopen Traffic]  <── [7. Verify]   <── [6. Restart Nodes]   <── [5. Deploy Code & Build]
```

### Step 1: Temporarily Gate Authentication Writes
To prevent in-flight invitation acceptance or password modifications during schema alterations, gate write endpoints at your reverse proxy (e.g. Nginx or Cloudflare) returning `HTTP 503 Service Unavailable`:
- `POST /api/auth/register`
- `POST /api/auth/invite`
- `POST /api/auth/setup-password`
- `POST /api/auth/reset-password`

*(Read-only requests, attendance queries, and static asset delivery can remain online).*

### Step 2: Full Database Backup
Create a point-in-time snapshot before running migrations:
```bash
# SQLite snapshot:
sqlite3 prisma/dev.db ".backup 'prisma/backup-pre-auth-hardening.db'"

# PostgreSQL snapshot (if applicable):
# pg_dump -U globepen globepen_prod > backup-pre-auth-hardening.sql
```

### Step 3: Run Additive Schema Migration
Apply the additive database migration:
```bash
npx prisma migrate deploy
```
*Note: This migration is 100% additive (`tokenVersion`, `setupTokenHash`, `resetTokenHash`, `resetTokenExpires`). Existing tables and columns are preserved.*

### Step 4: Run Dual-State Token Backfill Script
Populate `setupTokenHash` for existing invitation tokens:
```bash
npx tsx server/src/scripts/migrateInvitationTokens.ts
```

> [!IMPORTANT]
> **Dual-Read Backward Compatibility**:
> The backfill script intentionally does **NOT** nullify plaintext `setupToken` values during this step. This ensures that if any older server worker processes are still serving requests, existing invitation links continue working without interruption.

### Step 5: Deploy Application Code & Build Bundle
Deploy the updated server code and compile the production frontend:
```bash
npm run build
```

### Step 6: Restart Server Workers
Restart application processes:
```bash
pm2 restart globepen-api
# or systemctl restart globepen
```
On startup, `assertProductionSecrets()` verifies that `JWT_SECRET` meets entropy requirements (>= 32 chars) and validates `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`.

### Step 7: Post-Deployment Smoke Verification
- Verify `/api/health` returns `200 { status: 'ok' }`.
- Verify an invitation lookup via `GET /api/auth/verify-setup-token?token=<token>`.
- Verify password recovery dispatch via `POST /api/auth/forgot-password`.

### Step 8: Reopen Authentication Writes
Remove the reverse proxy 503 maintenance gate and resume normal operations.

### Step 9: Post-Pilot Plaintext Cleanup (Optional)
After the pilot deployment has operated successfully and older code has been retired, purge legacy plaintext tokens:
```bash
npx tsx server/src/scripts/migrateInvitationTokens.ts --purge-plaintext
```

---

## 3. Session Rotation & Forced Re-Login Semantics

### Why Existing Sessions Are Invalidated
All JWTs issued by the hardened server include the user's current `tokenVersion`.
- Legacy tokens issued prior to this deployment **omit** the `tokenVersion` claim.
- The hardened authentication middleware explicitly rejects tokens lacking `tokenVersion` with `HTTP 401 Unauthorized` (`Legacy session without token version`).
- **User Impact**: All logged-in staff and admins must perform a single fresh login to receive a versioned JWT cookie. Unsaved work in browser tabs will prompt for re-authentication.

---

## 4. Rollback Plan & Failure Recovery

If critical issues occur post-deployment, follow these rollback instructions:

### 1. Code Reversion
Re-deploy the previous application bundle or git commit and restart processes:
```bash
git checkout <previous-stable-commit>
npm run build
pm2 restart globepen-api
```

### 2. Database Schema Compatibility
- The schema changes (`tokenVersion`, `setupTokenHash`, etc.) are additive and optional with default values.
- **Do not drop columns**: The previous code version ignores these new columns. Keeping them prevents data loss if you re-attempt deployment.

### 3. Invitation Token Rollback Behavior
- Because the backfill script preserved plaintext `setupToken` values, legacy invitation links generated before the rollout continue to work with older code.
- **Invitations generated during the window**: Any staff invitation generated during the deployment window will have stored `setupTokenHash`. If rolling back, re-issue any invitations that were generated while the new code was live.

### 4. Session Revocation Rollback Limitations
- Older code does not validate `tokenVersion` against the database; it validates JWT signatures and expiration timestamps only.
- Consequently, if a user logged out or changed their password under the new code, their old JWT could technically be considered valid by older code until its natural expiration (e.g. 7 days).
- **Emergency Mitigation**: If an emergency security rollback requires guaranteeing that all sessions across the platform are invalidated, rotate `JWT_SECRET` in `.env` before restarting older code.

---

## 5. Production Environment Variables Reference

| Variable | Required? | Example / Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | `d4f8...` (>= 32 chars) | Cryptographically secure secret key. Insecure placeholders will fail startup. |
| `APPROVED_RECOVERY_ORIGINS` | **Yes** | `https://portal.globepen.com,https://app.school.edu` | Approved HTTPS origins for password reset URLs. |
| `SMTP_HOST` | **Yes** (Prod) | `smtp.postmarkapp.com` | Outbound mail server hostname. |
| `SMTP_PORT` | Optional | `587` | Outbound mail server port (default 587; 465 for SSL). |
| `SMTP_USER` | **Yes** (Prod) | `api-key-user` | SMTP authentication username. |
| `SMTP_PASS` | **Yes** (Prod) | `secret-smtp-password` | SMTP authentication password. |
| `SMTP_FROM` | Optional | `GlobePen Security <noreply@globepen.com>` | Email From address. |
| `SMTP_SECURE` | Optional | `false` | Force TLS/SSL connection (auto-detected if port is 465). |
| `USE_REAL_MAIL_TRANSPORT` | Optional | `false` | Set `true` to force real SMTP in non-production environments. |
| `TRUSTED_PROXIES` | Deployment | `10.0.0.0/8` | IP address or subnet of reverse proxy. |
