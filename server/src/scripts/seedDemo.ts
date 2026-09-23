import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';

const prisma = new PrismaClient();
try {
  if (await prisma.school.count()) throw new Error('Demo seed requires an empty database.');
  const school = await prisma.school.create({ data: {
    name: 'GlobePen Demo School', slug: 'demo', portalTitle: 'GlobePen Demo School Portal',
    slogan: 'A place to learn and grow', brandColor: '#2563eb', secondaryColor: '#0d9488',
    address: 'Demonstration school — sample data only',
  } });
  await prisma.schoolSettings.create({ data: { schoolId: school.id, schoolName: school.name, brandColor: '#2563eb', schoolSlogan: school.slogan } });
  const accounts = [];
  for (const [role, email, fullName] of [
    ['admin', 'admin@demo.ifyspace.tech', 'Demo School Administrator'],
    ['teacher', 'teacher@demo.ifyspace.tech', 'Demo Teacher'],
    ['superadmin', 'owner@app.ifyspace.tech', 'Platform Owner'],
  ]) {
    const password = crypto.randomBytes(18).toString('base64url');
    await prisma.user.create({ data: { email, fullName, role, passwordHash: await bcrypt.hash(password, 12),
      schoolId: role === 'superadmin' ? null : school.id, isAdmin: role === 'admin', isSuperAdmin: role === 'superadmin', status: 'active' } });
    accounts.push({ role, email, password, url: role === 'superadmin' ? 'https://app.ifyspace.tech/admin-panel' : 'https://demo.ifyspace.tech/login' });
  }
  fs.writeFileSync('/data/demo-access.json', JSON.stringify(accounts, null, 2), { mode: 0o600 });
  console.log('Demo school and three accounts created. Credentials saved privately.');
} finally { await prisma.$disconnect(); }
