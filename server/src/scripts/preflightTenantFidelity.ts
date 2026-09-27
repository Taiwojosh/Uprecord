/**
 * Read-Only Preflight Drift & Duplicate Inspection for Tenant Backfill
 *
 * Verifies that the target database contains zero duplicate natural keys that
 * would cause migration `20260926000000_tenant_backfill_fidelity` to fail:
 *   - Subject(schoolId, subjectName)
 *   - TraitDefinition(schoolId, traitName)
 *
 * SAFETY INVARIANTS:
 * - 100% READ-ONLY: Never alters, deletes, or deduplicates records.
 * - Safe reporting: Reports only counts, school IDs, and entity names.
 * - Exit code 0: Database is clean and ready for `prisma migrate deploy`.
 * - Exit code 1: Collisions exist; manual escalation/resolution required.
 *
 * USAGE:
 *   npx tsx server/src/scripts/preflightTenantFidelity.ts
 */
import dotenv from 'dotenv';
import prisma from '../lib/prisma.js';

dotenv.config();

interface DuplicateGroup {
  schoolId: string;
  name: string;
  count: number;
}

export async function checkNaturalKeyDuplicates(): Promise<{
  subjects: DuplicateGroup[];
  traits: DuplicateGroup[];
  isClean: boolean;
}> {
  // 1. Check Subject(schoolId, subjectName) duplicates
  const subjectDupesRaw = await prisma.$queryRawUnsafe<Array<{ schoolId: string; subjectName: string; count: number | bigint }>>(`
    SELECT "schoolId", "subjectName", COUNT(*) as count
    FROM "Subject"
    WHERE "schoolId" IS NOT NULL AND "subjectName" IS NOT NULL
    GROUP BY "schoolId", "subjectName"
    HAVING COUNT(*) > 1;
  `);

  const subjects: DuplicateGroup[] = subjectDupesRaw.map((r) => ({
    schoolId: r.schoolId,
    name: r.subjectName,
    count: Number(r.count),
  }));

  // 2. Check TraitDefinition(schoolId, traitName) duplicates
  const traitDupesRaw = await prisma.$queryRawUnsafe<Array<{ schoolId: string; traitName: string; count: number | bigint }>>(`
    SELECT "schoolId", "traitName", COUNT(*) as count
    FROM "TraitDefinition"
    WHERE "schoolId" IS NOT NULL AND "traitName" IS NOT NULL
    GROUP BY "schoolId", "traitName"
    HAVING COUNT(*) > 1;
  `);

  const traits: DuplicateGroup[] = traitDupesRaw.map((r) => ({
    schoolId: r.schoolId,
    name: r.traitName,
    count: Number(r.count),
  }));

  const isClean = subjects.length === 0 && traits.length === 0;

  return { subjects, traits, isClean };
}

async function main() {
  console.log('===============================================================');
  console.log('TENANT BACKFILL PREFLIGHT AUDIT: NATURAL KEY UNIQUENESS CHECK');
  console.log('Target DATABASE_URL:', process.env.DATABASE_URL || 'default');
  console.log('Mode: READ-ONLY');
  console.log('===============================================================\n');

  try {
    const { subjects, traits, isClean } = await checkNaturalKeyDuplicates();

    if (subjects.length > 0) {
      console.warn(`[FAIL] Found ${subjects.length} duplicate Subject group(s):`);
      for (const group of subjects) {
        console.warn(`  - School ID: "${group.schoolId}" | Subject: "${group.name}" | Count: ${group.count}`);
      }
    } else {
      console.log('[PASS] Subject(schoolId, subjectName): 0 duplicates found.');
    }

    if (traits.length > 0) {
      console.warn(`\n[FAIL] Found ${traits.length} duplicate TraitDefinition group(s):`);
      for (const group of traits) {
        console.warn(`  - School ID: "${group.schoolId}" | Trait: "${group.name}" | Count: ${group.count}`);
      }
    } else {
      console.log('[PASS] TraitDefinition(schoolId, traitName): 0 duplicates found.');
    }

    if (!isClean) {
      console.error('\n[PREFLIGHT FAILED]');
      console.error('The target database contains natural-key duplicates.');
      console.error('Applying migration 20260926000000_tenant_backfill_fidelity would fail on unique index creation.');
      console.error('ESCALATION REQUIRED: Manually reconcile duplicate records before deploying migration.');
      process.exit(1);
    }

    console.log('\n[PREFLIGHT PASSED] All unique index constraints can be applied safely.');
    process.exit(0);
  } catch (err) {
    console.error('[PREFLIGHT ERROR] Failed to execute duplicate check queries:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run when executed directly from CLI
if (process.argv[1]?.includes('preflightTenantFidelity')) {
  main();
}
