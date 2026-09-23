import crypto from 'crypto';
import prisma from '../lib/prisma.js';

/**
 * Migration Script: Dual-State Invitation Token Hash Backfill
 * 
 * BACKWARD COMPATIBILITY GUARANTEE:
 * Inspects all User records with active plaintext `setupToken` values,
 * computes their SHA-256 hash, and populates `setupTokenHash`.
 * 
 * CRITICAL MIGRATION SAFETY RULE:
 * The legacy plaintext `setupToken` column is NOT cleared during initial backfill!
 * This ensures that if older application nodes are still running or if an immediate
 * rollback is required, existing invitations continue to function without interruption.
 * 
 * A secondary cleanup function (`purgePlaintextInvitationTokens`) is provided to
 * erase plaintext tokens only after the hardened deployment is fully verified and signed off.
 */

export async function migrateInvitationTokens(): Promise<{ migratedCount: number }> {
  // Find users who have a plaintext setupToken but have not yet had setupTokenHash populated
  const usersToMigrate = await prisma.user.findMany({
    where: {
      setupToken: { not: null },
      setupTokenHash: null,
    },
    select: {
      id: true,
      setupToken: true,
    },
  });

  let migratedCount = 0;

  for (const user of usersToMigrate) {
    if (!user.setupToken) continue;

    const hash = crypto.createHash('sha256').update(user.setupToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        setupTokenHash: hash,
        // DO NOT nullify setupToken here: old code still needs it during rollout
      },
    });

    migratedCount++;
  }

  console.log(`[Token Backfill Complete] Populated setupTokenHash for ${migratedCount} user(s). Plaintext preserved for dual-read compatibility.`);
  return { migratedCount };
}

/**
 * Post-Verification Cleanup (Run only after pilot deployment is verified and traffic reopened)
 */
export async function purgePlaintextInvitationTokens(): Promise<{ purgedCount: number }> {
  const result = await prisma.user.updateMany({
    where: {
      setupToken: { not: null },
      setupTokenHash: { not: null },
    },
    data: {
      setupToken: null,
    },
  });

  console.log(`[Plaintext Cleanup Complete] Erased plaintext setupToken for ${result.count} user(s).`);
  return { purgedCount: result.count };
}

// CLI execution
if (process.argv[1]?.endsWith('migrateInvitationTokens.ts') || process.argv[1]?.endsWith('migrateInvitationTokens.js')) {
  const shouldPurge = process.argv.includes('--purge-plaintext');

  const action = shouldPurge ? purgePlaintextInvitationTokens() : migrateInvitationTokens();

  action
    .catch((err) => {
      console.error('[Token Backfill Error]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
