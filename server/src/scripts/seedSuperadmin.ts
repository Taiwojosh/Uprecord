import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

export async function seedSuperadmin(
  email = process.env.INITIAL_SUPERADMIN_EMAIL || 'superadmin@uprecord.local',
  password = process.env.INITIAL_SUPERADMIN_PASSWORD || 'SuperAdmin#2026!Secure'
) {
  const normalizedEmail = email.toLowerCase().trim();
  console.log(`[Seed Superadmin] Checking for superadmin account: ${normalizedEmail}...`);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        { role: 'superadmin' },
        { isSuperAdmin: true },
      ],
    },
  });

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    console.log(`[Seed Superadmin] Superadmin already exists (ID: ${existing.id}). Updating credentials and role...`);
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: normalizedEmail,
        passwordHash,
        role: 'superadmin',
        isAdmin: true,
        isSuperAdmin: true,
        status: 'active',
        tokenVersion: { increment: 1 },
      },
    });
    console.log(`[Seed Superadmin] Updated superadmin account (ID: ${updated.id}, Email: ${updated.email})`);
    return updated;
  }

  const superadmin = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      fullName: 'Platform Superadmin',
      role: 'superadmin',
      isAdmin: true,
      isSuperAdmin: true,
      status: 'active',
      schoolId: null,
    },
  });

  console.log(`[Seed Superadmin] Successfully created database-backed SUPERADMIN (ID: ${superadmin.id}, Email: ${superadmin.email})`);
  return superadmin;
}

// Run directly if invoked from CLI
if (process.argv[1]?.includes('seedSuperadmin')) {
  seedSuperadmin()
    .then(() => {
      console.log('[Seed Superadmin] Completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Superadmin Error]', err);
      process.exit(1);
    });
}
