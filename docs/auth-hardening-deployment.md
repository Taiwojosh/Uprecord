# GlobePen Native Authentication Hardening: Deployment, Migration & Rollback Guide

This guide details the deployment sequence, schema migrations, token backfill procedures, security configurations, and rollback plans for the GlobePen Phase 2 native authentication hardening.

---

## 1. Overview of Changes

The native authentication system was hardened with zero external vendor dependencies (SuperTokens deferred):
1. **Server-Side Session Validation & Revocation**:
   - `tokenVersion` (integer, default 0) stored per user in the database and embedded in signed JWTs.
   - Any password change, password reset, or `/logout` increments `tokenVersion`, invalidating active sessions across all devices immediately.
   - Suspended accounts (`status: 'suspended'`) and school membership mismatches return `HTTP 401` on subsequent requests.
   - Legacy tokens lacking `tokenVersion` are rejected with `HTTP 401`.
2. **Double-Submit CSRF Hardening**:
   - Strict CSRF protection enforced whenever an ambient authentication cookie is present, even if a `Bearer` header is passed.
   - `/logout` requires CSRF validation because it performs stateful session revocation.
   - Exact route matching prevents path traversal/near-miss bypasses.
   - Constant-time verification using `crypto.timingSafeEqual`.
3. **Password Recovery & Activation Hardening**:
   - Storage of invitation tokens and password reset tokens as SHA-256 hashes (`setupTokenHash`, `resetTokenHash`). Plaintext tokens are never stored in the database.
   - Atomic consumption via Prisma transactions and conditional queries (`updateMany`) preventing race conditions / simultaneous token reuse.
   - Read-only token verification endpoints (`GET /verify-setup-token`, `GET /verify-reset-token`) for safe UI pre-flight checks.
   - Recovery links constructed strictly from configured `APPROVED_RECOVERY_ORIGINS`.
   - Dual sliding-window rate limiting (IP: 50 requests/15m, Normalized Email: 5 requests/15m) with automatic bounded memory eviction.
   - Uniform `HTTP 200` anti-enumeration responses for password recovery regardless of user existence, school matching, or delivery outcomes.
   - Non-fatal email dispatch failure handling: delivery failures are logged internally but do not crash the process or alter the response status.

---

## 2. Additive Schema Migration

The migration is non-destructive and backward compatible with existing user records.

**Migration File**: `prisma/migrations/20260923000000_auth_hardening/migration.sql`

```sql
-- AlterTable: Add tokenVersion with default 0
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add hashed setup token column and reset token columns
ALTER TABLE "User" ADD COLUMN "setupTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpires" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_setupTokenHash_key" ON "User"("setupTokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "User_resetTokenHash_key" ON "User"("resetTokenHash");
```

---

## 3. Pre-Deployment Environment Configuration

Ensure the following environment variables are set in production:

| Variable | Requirement | Description |
|---|---|---|
| `JWT_SECRET` | Mandatory (>= 32 chars) | Cryptographically secure random string. Weak/default values abort startup. |
| `APPROVED_RECOVERY_ORIGINS` | Mandatory | Comma-separated list of approved HTTPS origins (e.g. `https://portal.globepen.com,https://app.school.edu`). Prevents host header poisoning in password reset emails. |
| `SMTP_HOST` | Mandatory in Production | SMTP server hostname. Verified at startup via `assertProductionSecrets()`. |
| `SMTP_PORT` | Optional (default 587) | SMTP port. |
| `SMTP_USER` | Mandatory in Production | SMTP authentication username. |
| `SMTP_PASS` | Mandatory in Production | SMTP authentication password. |
| `SMTP_FROM` | Optional | Sender address (e.g. `GlobePen Security <noreply@globepen.com>`). |
| `TRUSTED_PROXIES` | Deployment-specific | IP addresses or subnet of trusted reverse proxies. |

---

## 4. Deployment Ordering

Deployments must follow this exact four-stage sequence to guarantee zero downtime and uninterrupted user sessions:

### Step 1: Run Database Migration
Apply the additive schema migration before updating application code. Existing application nodes will continue operating normally as the new columns are optional with safe defaults.
```bash
npx prisma migrate deploy
```

### Step 2: Run Invitation Token Backfill Script
Migrate legacy plaintext `setupToken` values into SHA-256 `setupTokenHash` and clear the legacy plaintext column.
```bash
# Compiled JavaScript execution in production:
node dist/server/src/scripts/migrateInvitationTokens.js

# Or in TypeScript runtime environments:
npx tsx server/src/scripts/migrateInvitationTokens.ts
```
The backfill script is idempotent: running it multiple times processes only users where `setupToken IS NOT NULL` and `setupTokenHash IS NULL`.

### Step 3: Deploy Application Code & Build
Deploy the updated backend services and built frontend bundle (`dist/`).
```bash
npm run build
```

### Step 4: Graceful Process Restart
Restart application worker processes. On startup, `assertProductionSecrets()` validates `JWT_SECRET` strength and SMTP configuration.
```bash
pm2 restart globepen-api
# or systemctl restart globepen
```

---

## 5. Rollback Procedure

If a rollback of application code is required:

### Code Rollback
1. Re-deploy the previous release bundle or git revision.
2. Restart the application workers:
   ```bash
   pm2 restart globepen-api
   ```

### Schema Considerations
- **Do not drop columns immediately**: The added columns (`tokenVersion`, `setupTokenHash`, `resetTokenHash`, `resetTokenExpires`) are completely additive and will not interfere with older code versions.
- If pending invitation links were created during the deployment window, users who received them will use the new hash format. Keeping the columns intact ensures no invitation state is lost if the rollout is resumed.
- If full database schema rollback is required:
  ```bash
  -- Only execute if fully abandoning the release:
  -- SQLite does not drop columns directly without table recreation; Prisma handles this via migration down scripts if configured.
  ```

---

## 6. Multi-Device Revocation Semantics

- **Login**: Issues a JWT containing `tokenVersion: <current DB value>`.
- **Logout (`POST /api/auth/logout`)**:
  - Increments `tokenVersion` in the database.
  - Clears `auth_token` and `csrf_token` cookies.
  - Revokes all existing JWTs across all active browsers and mobile devices for that account.
- **Password Reset / Change**: Increments `tokenVersion` atomically alongside the password update, ensuring compromised or stolen tokens cannot be used after credentials are reset.
- **Account Suspension**: Changing user status to `suspended` takes effect immediately on the user's next authenticated request, returning `HTTP 401`.
