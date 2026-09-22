import prisma from '../lib/prisma.js';
import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { getPlatformHosts, getPlatformBaseDomains } from '../config/domains.js';

/**
 * Utility to convert a school name into a clean, URL-safe slug.
 */
export function generateSlug(name: string, fallbackId?: string): string {
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/g, '');
  const reserved = new Set(['www', 'app', 'api', 'admin', 'auth', 'login', 'mail', 'support', 'status']);
  for (const host of getPlatformHosts()) {
    for (const domain of getPlatformBaseDomains()) {
      if (host.endsWith(`.${domain}`)) reserved.add(host.slice(0, -domain.length - 1));
    }
  }
  if (reserved.has(base)) base = `school-${base}`.slice(0, 48);

  if (base.length >= 2) {
    return base;
  }
  return `school-${(fallbackId || crypto.randomUUID()).replace(/[^a-z0-9]/gi, '').slice(-12).toLowerCase()}`;
}

export async function allocateSchoolSlug(tx: Prisma.TransactionClient, name: string): Promise<string> {
  const base = generateSlug(name);
  let candidate = base;
  let counter = 1;
  while (await tx.school.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${++counter}`;
  }
  return candidate;
}

/**
 * Migration backfill: Ensure all existing schools have a unique, URL-safe slug.
 * 
 * Rollback Procedure:
 * Back up the database first. Restore that backup and the previous code together
 * for rollback; never clear slugs on live schools. See docs/phase2a-deployment.md.
 */
export async function backfillSchoolSlugs(): Promise<{ updated: number; total: number }> {
  const schools = await prisma.school.findMany({
    orderBy: { createdAt: 'asc' },
  });

  let updatedCount = 0;
  const existingSlugs = new Set<string>();

  // Collect any already-assigned slugs
  for (const s of schools) {
    if (s.slug) {
      existingSlugs.add(s.slug);
    }
  }

  for (const s of schools) {
    if (!s.slug) {
      let candidate = generateSlug(s.name, s.id);
      let counter = 1;
      while (existingSlugs.has(candidate)) {
        counter++;
        candidate = `${generateSlug(s.name, s.id)}-${counter}`;
      }

      await prisma.school.update({
        where: { id: s.id },
        data: {
          slug: candidate,
          portalTitle: s.portalTitle || `${s.name} Portal`,
        },
      });

      existingSlugs.add(candidate);
      updatedCount++;
      console.log(`[Backfill] Assigned slug '${candidate}' to school '${s.name}' (${s.id})`);
    }
  }

  console.log(`[Backfill Complete] Processed ${schools.length} schools; assigned ${updatedCount} new slugs.`);
  return { updated: updatedCount, total: schools.length };
}

// Allow direct CLI execution: npx tsx server/src/scripts/backfillSlugs.ts
if (process.argv[1]?.includes('backfillSlugs')) {
  backfillSchoolSlugs()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Backfill Error]', err);
      process.exit(1);
    });
}
