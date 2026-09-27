# Tenant Backfill — Promoting Offline Data into the Tenant Database

Reviewed 26 September 2026. Applies to the GlobePen multi-tenant pilot.

## Why this exists

The client application reads and writes **IndexedDB (Dexie)** as its database.
The Express/Prisma server exposes a fully tenant-isolated API
(`server/src/dal/tenantDb.ts`, `server/src/middleware/tenant.ts`), but no
registry data (students, classes, subjects, grades, settings) currently travels
through it — the browser is still the only store for school records.

The consequence is a split brain: two administrators of the same school, on two
machines, each hold a private roster. Before any sync can be built, the server
must own the data. That is what this importer does, in the only safe direction:

```
IndexedDB (one browser)  ──backfill──▶  tenant database (source of truth)  ──sync──▶  every device
```

Importing first, then syncing on top, means the first "pull" a fresh device
performs can never look like data loss.

## Scope of the Devickys import

`src/data/devickysBackup.json` (also mirrored at
`public/backups/devickys-backup.json`) is a Dexie export of Devickys Gem
Schools and is not referenced by any application code — it is the only copy of
that school's records outside the original browser. Its tables:

| Backup table | Rows | Server model |
| ------------ | ---- | ------------ |
| `settings` | 1 | `SchoolSettings` (+ `School` branding) |
| `classes` | 6 | `Class` |
| `subjects` | 24 | `Subject` |
| `traits` | 22 | `TraitDefinition` |
| `students` | 117 | `Student` |
| `grades` | 1,224 | `Grade` |
| `traitGrades` | 2,143 | `TraitGrade` |
| `attendance` | 99 | `Attendance` |
| `activation`, `comments` | 0 | not imported (nothing to import) |

There is **no `users` table** in the export, so the importer creates the tenant
administrator through the product's activation-token flow
(`status: pending_activation` + `/setup-password?token=…`) and prints the
one-time link. Teacher names exist on classes but have no accounts; invite them
from Admin → Users.

## Prerequisite migration

`prisma/migrations/20260926000000_tenant_backfill_fidelity` must be applied
before importing. It is what makes the import lossless and re-runnable:

- `Subject.departmentIds`, `coreLevels`, `classIds`, `assistantTeacherIds`
  (JSON strings). Without these, department/level subject filtering — and
  therefore report card contents — would silently change.
- `SchoolSettings.holidayDates`, `holidayNames`.
- `UNIQUE (schoolId, subjectName)` and `UNIQUE (schoolId, traitName)` so a
  re-run upserts instead of duplicating 24 subjects and 22 traits.

```bash
npm run db:migrate        # dev database
npx prisma generate       # regenerate the client with the new fields
```

## Running it

```bash
# 1. Dry run (default) — validates, resolves every foreign key, writes nothing
npm run seed:tenant -- --file=src/data/devickysBackup.json --slug=devickys

# 2. Review the summary, then commit
npm run seed:tenant -- --file=src/data/devickysBackup.json --slug=devickys --apply
```

Back up the database immediately before `--apply`:

```bash
cp prisma/dev.db prisma/dev.db.pre-devickys-backfill
```

### Flags

| Flag | Meaning |
| ---- | ------- |
| `--file=<path>` | Backup to import (default `src/data/devickysBackup.json`) |
| `--slug=<slug>` | Tenant slug, i.e. the subdomain (`devickys` → `devickys.<base domain>`) |
| `--school-name=` | Override the school name from the backup |
| `--admin-email=` | Tenant admin address (default `admin@<slug>.local`) |
| `--admin-name=` | Tenant admin display name |
| `--admin-password=` | Create the admin active with this password instead of an activation link |
| `--apply` | Commit. Without it the run is a dry run |
| `--force` | Allow reconciling into a tenant that already has students |

Environment fallbacks: `TENANT_SLUG`, `TENANT_ADMIN_EMAIL`, `CLIENT_URL` (used
to build the activation link).

### Output

```
Tenant Backfill Summary
───────────────────────────────────────────────────────────
School     : Devickys Gem Schools (slug "devickys")
Mode       : DRY RUN — no writes were committed

Table         created   updated   unchanged   skipped
school              1         0           0         0
students          117         0           0         0
...
Admin      : admin@devickys.local (created)
Activation : http://localhost:3000/setup-password?token=…
```

## Safety properties

- **Dry run by default.** The dry run executes the identical code path inside a
  transaction and rolls it back, so the numbers it reports are exactly what an
  `--apply` run will produce.
- **Refuses populated tenants.** If the slug already holds students the run
  aborts unless `--force` is passed — a second laptop cannot clobber the school.
- **Local ids are never reused.** Local autoincrement ids are per-device; every
  foreign key is rewritten to the server-assigned id (asserted in
  `server/tests/tenant-backfill.test.ts`).
- **Unresolvable rows are skipped and reported**, never guessed. A record whose
  `classId` or `studentId` is absent from the backup is counted under `skipped`
  and listed in the warnings.
- **Idempotent.** Rows are matched on natural keys (`admissionNumber`,
  `className`, `subjectName`, `traitName`, composite keys for grades). A second
  run creates nothing and rewrites nothing; only genuine source changes are
  written.
- **Tenant-scoped.** Every created row carries the resolved `schoolId`, and the
  test suite asserts another tenant's rows are untouched.

## Rollback

```bash
# Stop the API server, then either restore the backup you took:
cp prisma/dev.db.pre-devickys-backfill prisma/dev.db

# or delete the tenant — Prisma cascades every imported row:
npx prisma studio     # delete the School row for slug "devickys"
```

## After a successful import

The server is now the source of truth for Devickys, which unblocks the sync
work, in this order:

1. **Identity + change tracking.** Add a client-generated `uuid` per synced row
   (local `++id` ids cannot be compared across devices), plus `updatedAt`,
   `deletedAt` and a server-side `revision`. Tombstones are required because a
   hard delete cannot propagate.
2. **Outbox + push/pull.** A Dexie `outbox` table written in the same
   transaction as each local mutation, flushed to `POST /api/sync/push`, with
   `GET /api/sync/pull?since=` hydrating Dexie on login/online/focus. The
   existing `useLiveQuery` screens then update with no page rewrites.
3. **Retire Firestore.** `src/lib/attendanceSync.ts` still writes attendance to
   Firestore; point it at `/api/sync/*` so there is a single store.
4. **Missing routes.** Only students, classes and settings exist server-side
   today (`server/src/index.ts`); the sync surface needs the rest.

Until step 2 ships, the client keeps reading its local copy — this import makes
the data *recoverable and shared*, and is the prerequisite for making it *live*.



## Production Migration Preflight Check (Read-Only)

Before deploying migration `20260926000000_tenant_backfill_fidelity` to production, execute a read-only preflight check to verify that no natural key collisions exist that would block the creation of unique indexes:
- `CREATE UNIQUE INDEX "Subject_schoolId_subjectName_key" ON "Subject"("schoolId", "subjectName");`
- `CREATE UNIQUE INDEX "TraitDefinition_schoolId_traitName_key" ON "TraitDefinition"("schoolId", "traitName");`

### Read-Only Preflight Queries

Execute the following queries against the target database:

```sql
-- 1. Check for duplicate Subjects within the same school
SELECT "schoolId", "subjectName", COUNT(*) AS duplicate_count
FROM "Subject"
WHERE "schoolId" IS NOT NULL AND "subjectName" IS NOT NULL
GROUP BY "schoolId", "subjectName"
HAVING COUNT(*) > 1;

-- 2. Check for duplicate TraitDefinitions within the same school
SELECT "schoolId", "traitName", COUNT(*) AS duplicate_count
FROM "TraitDefinition"
WHERE "schoolId" IS NOT NULL AND "traitName" IS NOT NULL
GROUP BY "schoolId", "traitName"
HAVING COUNT(*) > 1;
```

### Preflight Script Execution

Run the provided read-only CLI checker:
```bash
npx tsx server/src/scripts/preflightTenantFidelity.ts
```

- **Exit code 0:** Zero collisions detected. Safe to proceed with `prisma migrate deploy`.
- **Exit code 1:** Collisions detected. **DO NOT APPLY THE MIGRATION.** Escalation is required to manually inspect and reconcile the colliding rows before applying the migration. Never delete or alter production records automatically.
