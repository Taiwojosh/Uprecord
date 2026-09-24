import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, chmodSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const slug = process.env.SCHOOL_SLUG || 'devickys';
  const school = await prisma.school.findUniqueOrThrow({ where: { slug } });
  const email = `admin@${slug}.ifyspace.tech`;
  const file = process.env.CREDENTIALS_FILE || '/data/private/devikys-admin.json';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.schoolId !== school.id || existing.role !== 'admin') throw new Error('Existing account scope mismatch');
    console.log('Administrator already exists; credentials unchanged.');
    return;
  }
  if (existsSync(file)) throw new Error('Credential file already exists; inspect it before provisioning');
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  chmodSync(dirname(file), 0o700);
  const password = randomBytes(24).toString('base64url');
  await prisma.$transaction(async tx => {
    await tx.user.create({ data: { email, fullName: 'School Pilot Administrator', role: 'admin', isAdmin: true, schoolId: school.id, passwordHash: await bcrypt.hash(password, 12) } });
    writeFileSync(file, JSON.stringify({ url: `https://${slug}.ifyspace.tech/login`, email, password }, null, 2), { mode: 0o600, flag: 'wx' });
  });
  console.log(`Administrator provisioned; credentials saved privately at ${file}`);
}
main().catch(() => { console.error('Provisioning failed; inspect database and credential-file state before retrying.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
