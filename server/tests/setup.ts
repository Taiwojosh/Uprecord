import prisma from '../src/lib/prisma.js';
import { beforeAll, afterAll } from 'vitest';

export async function resetTestDatabase() {
  // Delete in order to avoid foreign key constraints
  try {
    await prisma.cbtAttempt.deleteMany({});
    await prisma.cbtAssessment.deleteMany({});
    await prisma.liveLesson.deleteMany({});
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
  await resetTestDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
