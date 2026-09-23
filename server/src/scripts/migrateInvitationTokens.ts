import crypto from 'crypto';
import prisma from '../lib/prisma.js';

/**
 * Migration Script: Migrate Plaintext Invitation Tokens to SHA-256 Hashes
 * 
 * Inspects all User records with active plaintext `setupToken` values,
 * computes their SHA-256 hash, stores it in `setupTokenHash`, and clears
 * the plaintext `setupToken`.
 * 
 * Existing valid invitation links containing the raw token continue to work,
 * as the verification handler hashes the incoming raw token and matches against
 * `setupTokenHash`. Plaintext tokens are completely erased from the database.
 */
export async function migrateInvitationTokens(): Promise<{ migratedCount: number }> {
  const usersWithPlaintext = await prisma.user.findMany({
    where: {
      setupToken: { not: null },
    },
    select: {
      id: true,
      setupToken: true,
    },
  });

  let migratedCount = 0;

  for (const user of usersWithPlaintext) {
    if (!user.setupToken) continue;

    const hash = crypto.createHash('sha256').update(user.setupToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        setupTokenHash: hash,
        setupToken: null,
      },
    });

    migratedCount++;
  }

  console.log(`[Token Migration Complete] Migrated ${migratedCount} invitation token(s) to SHA-256 hashes and cleared plaintext.`);
  return { migratedCount };
}

// Direct execution
if (process.argv[1]?.endsWith('migrateInvitationTokens.ts') || process.argv[1]?.endsWith('migrateInvitationTokens.js')) {
  migrateInvitationTokens()
    .catch((err) => {
      console.error('[Token Migration Error]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
