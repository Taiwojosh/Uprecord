import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  // Find the DEVIKYS school by slug (assumes slug is 'devikys')
  const school = await prisma.school.findFirst({ where: { slug: 'devikys' } });
  if (!school) {
    console.error('DEVIKYS school not found (slug=devikys).');
    process.exit(1);
  }

  // Generate a strong random password (16 characters, base64url)
  const password = crypto.randomBytes(12).toString('base64url');
  const email = `admin@${school.slug}.example.com`;

  // Create the admin user (role admin, isAdmin true)
  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'DEVIKYS School Admin',
      role: 'admin',
      isAdmin: true,
      schoolId: school.id,
      // Store a hash of the password (bcryptjs)
      passwordHash: await hashPassword(password),
    },
  });

  // Prepare credentials object
  const creds = { email: user.email, password };
  const credsPath = '/srv/globepen/shared/private/devikys-admin.json';
  const dir = path.dirname(credsPath);
  // Ensure directory exists
  fs.mkdirSync(dir, { recursive: true });
  // Write JSON with restricted permissions (600)
  fs.writeFileSync(credsPath, JSON.stringify(creds, null, 2), { mode: 0o600 });
  console.log(`Admin credentials written to ${credsPath}`);
}

async function hashPassword(pw: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

main()
  .catch((e) => {
    console.error('Error creating admin:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
