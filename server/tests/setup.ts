import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prisma from '../src/lib/prisma.js';
import { beforeAll, afterAll } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

export async function resetTestDatabase() {
  // Delete in order to avoid foreign key constraints
  try {
    await prisma.grade.deleteMany({});
    await prisma.dailyAttendance.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.curriculum.deleteMany({});
    await prisma.lessonNote.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.class.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.traitGrade.deleteMany({});
    await prisma.traitDefinition.deleteMany({});
    await prisma.schoolSettings.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.school.deleteMany({});
  } catch (err) {
    console.warn('[Test DB Reset Notice]', err);
  }
}

beforeAll(async () => {
  try {
    execSync('node node_modules/prisma/build/index.js migrate deploy', {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'file:./test.db' },
      stdio: 'ignore',
    });
  } catch (err) {
    console.warn('[Test DB Migration Notice]', err);
  }
  await resetTestDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
