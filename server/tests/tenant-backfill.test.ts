import crypto from 'node:crypto';
import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/lib/prisma.js';
import { resetTestDatabase } from './setup.js';
import { checkNaturalKeyDuplicates } from '../src/scripts/preflightTenantFidelity.js';
import {
  importTenantBackup,
  analyzeBackup,
  parseCliOptions,
  loadBackupFile,
  type LegacyBackup,
} from '../src/scripts/importTenantBackup.js';

/**
 * Compact fixture that mirrors the real Devickys export shape, including the
 * hazards the importer must survive: local (per-device) ids that must NOT be
 * reused, dangling foreign keys, JSON-encoded arrays, and a class link that
 * points at a class absent from the backup.
 */
function fixture(): LegacyBackup {
  return {
    activation: [],
    settings: [
      {
        schoolName: 'Devickys Gem Schools',
        schoolSlogan: 'Be of a good will and intelect...',
        address: '2b Omotola street, Iwaya, Yaba Lagos Nig.',
        brandColor: '#00b32d',
        principalName: 'Mrs Okafor',
        nextTermDate: '2026-05-04',
        termClosingDate: '2026-04-10',
        currentTerm: 2,
        currentSession: '2025/2026',
        totalSubjectScore: 100,
        examMaxScore: 60,
        caMaxScore: 40,
        caComponents: [{ id: 'ca1', name: '1st Test', maxScore: 20 }],
        daysSchoolOpen: 122,
        department1Name: 'Arts and Humanities',
        department2Name: 'Business',
        department3Name: 'Science',
        enableLevelSubjectFiltering: true,
        gradingScale: [{ grade: 'A', minScore: 70, remark: 'EXCELLENT' }],
        reportCardTemplate: 'modern',
        enableGradeColors: true,
        publishedTerms: ['2025/2026:1'],
        holidayDates: ['2026-01-01'],
        holidayNames: { '2026-01-01': 'New Year' },
      },
    ],
    classes: [
      { id: 11, className: 'JSS 2 Alpha', level: 'junior', teacherName: 'Mr Bello', departmentId: 3, capacity: 35 },
      { id: 12, className: 'SS 1 Science', level: 'senior', teacherName: 'Mrs Ade', departmentId: 3, capacity: 40 },
    ],
    subjects: [
      { id: 21, subjectName: 'Mathematics', isCore: true, departmentIds: [3], coreLevels: ['junior', 'senior'], classIds: [11, 12] },
      { id: 22, subjectName: 'Biology', isCore: false, departmentIds: [3], coreLevels: ['senior'], classIds: [999] },
    ],
    traits: [
      { id: 31, traitName: 'Punctuality', displayOrder: 1, category: 'affective' },
      { id: 32, traitName: 'Handwriting', displayOrder: 10, category: 'psychomotor' },
    ],
    students: [
      { id: 41, admissionNumber: 'DGS-2024-042', fullName: 'David Adeyemi', gender: 'Male', classId: 11, status: 'Active', enrolledDate: '2025-09-01', photoBase64: 'data:image/png;base64,AAA', parentPhone: '+2348033123456' },
      { id: 42, admissionNumber: 'DGS-2023-019', fullName: 'Chidinma Okonkwo', gender: 'Female', classId: 12, status: 'Active' },
      { id: 43, admissionNumber: 'DGS-2024-088', fullName: 'Fatimah Aliyu', gender: 'Female', classId: 999 },
    ],
    grades: [
      { id: 51, studentId: 41, subjectId: 21, term: 1, session: '2025/2026', caScores: { ca1: 15, ca2: 15 }, examScore: 50, total: 80, grade: 'A', remark: 'Excellent' },
      { id: 52, studentId: 999, subjectId: 21, term: 1, session: '2025/2026', examScore: 10 },
    ],
    traitGrades: [{ id: 61, studentId: 41, traitId: 31, term: 1, session: '2025/2026', score: 4 }],
    attendance: [{ id: 71, studentId: 41, term: 1, session: '2025/2026', daysPresent: 112, totalDays: 114, principalRemark: 'Good progress' }],
    comments: [],
  };
}

const baseOptions = { schoolSlug: 'devickys', adminEmail: 'admin@devickys.test' };

describe('Tenant backfill importer', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('defaults to a dry run that reports work without writing anything', async () => {
    const summary = await importTenantBackup({ backup: fixture(), ...baseOptions });

    expect(summary.dryRun).toBe(true);
    expect(summary.counts.students.created).toBe(2);
    expect(summary.counts.students.skipped).toBe(1);
    expect(summary.counts.grades.created).toBe(1);
    expect(summary.counts.classes.created).toBe(2);

    // Nothing was committed
    expect(await prisma.school.count()).toBe(0);
    expect(await prisma.student.count()).toBe(0);
    expect(await prisma.user.count()).toBe(0);
  });

  it('imports the tenant and remaps every local id to a server id', async () => {
    const summary = await importTenantBackup({ backup: fixture(), ...baseOptions, apply: true });
    const school = await prisma.school.findUniqueOrThrow({ where: { slug: 'devickys' } });

    expect(summary.schoolCreated).toBe(true);
    expect(summary.counts.school.created).toBe(1);
    expect(summary.counts.settings.created).toBe(1);
    expect(summary.counts.traits.created).toBe(2);
    expect(summary.counts.traitGrades.created).toBe(1);
    expect(summary.counts.attendance.created).toBe(1);
    expect(summary.counts.grades.created).toBe(1);

    const david = await prisma.student.findFirstOrThrow({
      where: { schoolId: school.id, admissionNumber: 'DGS-2024-042' },
    });

    // The local id (41) is per-device and must never be copied onto the server.
    expect(david.id).not.toBe(41);

    // The class foreign key was rewritten to the server-assigned class id.
    expect(david.classId).not.toBe(11);
    const davidClass = await prisma.class.findFirstOrThrow({ where: { id: david.classId, schoolId: school.id } });
    expect(davidClass.className).toBe('JSS 2 Alpha');

    // The grade points at the imported student and imported subject.
    const grade = await prisma.grade.findFirstOrThrow({ where: { schoolId: school.id } });
    const mathematics = await prisma.subject.findFirstOrThrow({ where: { schoolId: school.id, subjectName: 'Mathematics' } });
    expect(grade.studentId).toBe(david.id);
    expect(grade.subjectId).toBe(mathematics.id);
    expect(JSON.parse(grade.caScores)).toEqual({ ca1: 15, ca2: 15 });

    const attendance = await prisma.attendance.findFirstOrThrow({ where: { schoolId: school.id } });
    expect(attendance.studentId).toBe(david.id);
    expect(attendance.daysPresent).toBe(112);
    expect(attendance.totalDays).toBe(114);

    const traitGrade = await prisma.traitGrade.findFirstOrThrow({ where: { schoolId: school.id } });
    const punctuality = await prisma.traitDefinition.findFirstOrThrow({
      where: { schoolId: school.id, traitName: 'Punctuality' },
    });
    expect(traitGrade.studentId).toBe(david.id);
    expect(traitGrade.traitId).toBe(punctuality.id);
    expect(traitGrade.score).toBe(4);
  });

  it('preserves JSON-encoded arrays and drops only the unresolvable class links', async () => {
    const summary = await importTenantBackup({ backup: fixture(), ...baseOptions, apply: true });
    const school = await prisma.school.findUniqueOrThrow({ where: { slug: 'devickys' } });

    const mathematics = await prisma.subject.findFirstOrThrow({ where: { schoolId: school.id, subjectName: 'Mathematics' } });
    expect(JSON.parse(mathematics.departmentIds ?? 'null')).toEqual([3]);
    expect(JSON.parse(mathematics.coreLevels ?? 'null')).toEqual(['junior', 'senior']);

    // classIds were rewritten to server class ids, not the local ones (11, 12)
    const classIds = JSON.parse(mathematics.classIds ?? 'null') as number[];
    const serverClassIds = (await prisma.class.findMany({ where: { schoolId: school.id } })).map((row) => row.id);
    expect(classIds).toHaveLength(2);
    expect(classIds.every((id) => serverClassIds.includes(id))).toBe(true);

    // Biology referenced class 999 which does not exist in the backup: the link
    // is dropped and surfaced rather than silently invented.
    const biology = await prisma.subject.findFirstOrThrow({ where: { schoolId: school.id, subjectName: 'Biology' } });
    expect(JSON.parse(biology.classIds ?? 'null')).toEqual([]);
    expect(summary.warnings.some((warning) => warning.includes('subject↔class link'))).toBe(true);

    const settings = await prisma.schoolSettings.findUniqueOrThrow({ where: { schoolId: school.id } });
    expect(JSON.parse(settings.holidayNames ?? 'null')).toEqual({ '2026-01-01': 'New Year' });
    expect(JSON.parse(settings.holidayDates ?? 'null')).toEqual(['2026-01-01']);
    expect(JSON.parse(settings.gradingScale ?? 'null')).toEqual([{ grade: 'A', minScore: 70, remark: 'EXCELLENT' }]);
    expect(JSON.parse(settings.caComponents ?? 'null')).toEqual([{ id: 'ca1', name: '1st Test', maxScore: 20 }]);
    expect(settings.currentTerm).toBe(2);
    expect(settings.enableLevelSubjectFiltering).toBe(true);

    // The school record carries the branding the portal header reads.
    expect(school.brandColor).toBe('#00b32d');
    expect(school.name).toBe('Devickys Gem Schools');
  });

  it('is idempotent: a second run creates nothing and rewrites nothing', async () => {
    await importTenantBackup({ backup: fixture(), ...baseOptions, apply: true });
    const school = await prisma.school.findUniqueOrThrow({ where: { slug: 'devickys' } });

    const second = await importTenantBackup({ backup: fixture(), ...baseOptions, apply: true, force: true });

    expect(second.schoolCreated).toBe(false);
    for (const table of ['classes', 'subjects', 'traits', 'students', 'grades', 'traitGrades', 'attendance', 'settings']) {
      expect(second.counts[table].created, `${table} should not be re-created`).toBe(0);
      expect(second.counts[table].updated, `${table} should not be rewritten`).toBe(0);
    }

    expect(await prisma.student.count({ where: { schoolId: school.id } })).toBe(2);
    expect(await prisma.subject.count({ where: { schoolId: school.id } })).toBe(2);
    expect(await prisma.class.count({ where: { schoolId: school.id } })).toBe(2);
    expect(await prisma.grade.count({ where: { schoolId: school.id } })).toBe(1);
  });

  it('reports a genuine change as an update instead of a duplicate', async () => {
    await importTenantBackup({ backup: fixture(), ...baseOptions, apply: true });

    const changed = fixture();
    changed.students![0].fullName = 'David A. Adeyemi';
    const summary = await importTenantBackup({ backup: changed, ...baseOptions, apply: true, force: true });

    expect(summary.counts.students.created).toBe(0);
    expect(summary.counts.students.updated).toBe(1);
    expect(summary.counts.students.unchanged).toBe(1);
    expect(await prisma.student.count()).toBe(2);

    const david = await prisma.student.findFirstOrThrow({ where: { admissionNumber: 'DGS-2024-042' } });
    expect(david.fullName).toBe('David A. Adeyemi');
  });

  it('refuses to overwrite a populated tenant unless forced', async () => {
    const populated = await prisma.school.create({ data: { name: 'Devickys Gem Schools', slug: 'devickys' } });
    const existingClass = await prisma.class.create({
      data: { schoolId: populated.id, className: 'Existing Class', level: 'junior' },
    });
    await prisma.student.create({
      data: {
        schoolId: populated.id,
        admissionNumber: 'EXISTING-001',
        fullName: 'Existing Student',
        gender: 'Male',
        classId: existingClass.id,
      },
    });

    await expect(importTenantBackup({ backup: fixture(), ...baseOptions, apply: true }))
      .rejects.toThrow(/already holds 1 students/);

    // The guard aborted before writing, so the tenant is untouched.
    expect(await prisma.student.count({ where: { schoolId: populated.id } })).toBe(1);
    expect(await prisma.class.count({ where: { schoolId: populated.id } })).toBe(1);
  });

  it('never leaks rows into another tenant', async () => {
    const other = await prisma.school.create({ data: { name: 'Other School', slug: 'other-school' } });
    const otherClass = await prisma.class.create({
      data: { schoolId: other.id, className: 'Other Class', level: 'senior' },
    });
    const otherStudent = await prisma.student.create({
      data: { schoolId: other.id, admissionNumber: 'OTH-001', fullName: 'Other Student', gender: 'Female', classId: otherClass.id },
    });

    await importTenantBackup({ backup: fixture(), ...baseOptions, apply: true });
    const school = await prisma.school.findUniqueOrThrow({ where: { slug: 'devickys' } });

    expect(await prisma.student.count({ where: { schoolId: other.id } })).toBe(1);
    expect(await prisma.class.count({ where: { schoolId: other.id } })).toBe(1);
    expect(await prisma.grade.count({ where: { schoolId: other.id } })).toBe(0);

    const otherStudentAfter = await prisma.student.findUniqueOrThrow({ where: { id: otherStudent.id } });
    expect(otherStudentAfter.fullName).toBe('Other Student');

    const imported = await prisma.student.findMany({ where: { schoolId: school.id } });
    expect(imported).toHaveLength(2);
    expect(imported.every((row) => row.schoolId === school.id)).toBe(true);
  });

  it('creates the tenant admin through the activation-token flow by default', async () => {
    const summary = await importTenantBackup({ backup: fixture(), ...baseOptions, apply: true });

    expect(summary.admin?.email).toBe('admin@devickys.test');
    expect(summary.admin?.created).toBe(true);
    expect(summary.admin?.activationUrl).toContain('/setup-password?token=');

    // Extract plaintext token from activation URL
    const tokenMatch = summary.admin?.activationUrl?.match(/token=([a-f0-9]+)/);
    expect(tokenMatch).not.toBeNull();
    const plaintextToken = tokenMatch![1];

    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@devickys.test' } });
    expect(admin.role).toBe('admin');
    expect(admin.isAdmin).toBe(true);
    expect(admin.status).toBe('pending_activation');
    expect(admin.passwordHash).toBeNull();

    // Verification of token security: plaintext is NOT persisted, only SHA-256 hash
    expect(admin.setupToken).toBeNull();
    expect(admin.setupTokenHash).not.toBeNull();
    const expectedHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');
    expect(admin.setupTokenHash).toBe(expectedHash);
    expect(admin.setupTokenExpires).not.toBeNull();
    expect(admin.setupTokenExpires!.getTime()).toBeGreaterThan(Date.now());
  });

  it('password-supplied admin creation does not generate an activation token', async () => {
    const summary = await importTenantBackup({
      backup: fixture(),
      ...baseOptions,
      adminPassword: 'Secure#Password2026',
      apply: true,
    });

    expect(summary.admin?.email).toBe('admin@devickys.test');
    expect(summary.admin?.created).toBe(true);
    expect(summary.admin?.activationUrl).toBeNull();

    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@devickys.test' } });
    expect(admin.role).toBe('admin');
    expect(admin.isAdmin).toBe(true);
    expect(admin.status).toBe('active');
    expect(admin.passwordHash).not.toBeNull();
    expect(admin.setupToken).toBeNull();
    expect(admin.setupTokenHash).toBeNull();
    expect(admin.setupTokenExpires).toBeNull();
  });
});

describe('Tenant backfill helpers', () => {
  it('reports duplicate natural keys instead of failing the import', () => {
    const duplicating = fixture();
    duplicating.students!.push({ ...duplicating.students![0] });
    duplicating.subjects!.push({ ...duplicating.subjects![0] });

    const analysis = analyzeBackup(duplicating);
    expect(analysis.duplicateAdmissions).toEqual(['DGS-2024-042']);
    expect(analysis.duplicateSubjectNames).toEqual(['Mathematics']);
    expect(analysis.teacherNames).toEqual(['Mr Bello', 'Mrs Ade']);
  });

  it('preflight check reports clean when zero duplicate natural keys exist', async () => {
    const { subjects, traits, isClean } = await checkNaturalKeyDuplicates();
    expect(isClean).toBe(true);
    expect(subjects).toHaveLength(0);
    expect(traits).toHaveLength(0);
  });

  it('parses CLI flags', () => {
    const options = parseCliOptions([
      '--file=src/data/devickysBackup.json',
      '--slug=devickys',
      '--admin-email=admin@school.test',
      '--apply',
      '--force',
      '--unknown-flag=ignored',
    ]);

    expect(options.backupPath).toBe('src/data/devickysBackup.json');
    expect(options.schoolSlug).toBe('devickys');
    expect(options.adminEmail).toBe('admin@school.test');
    expect(options.apply).toBe(true);
    expect(options.force).toBe(true);
    expect(options.schoolName).toBeUndefined();
  });

  it('defaults to a dry run and rejects a backup without settings', async () => {
    expect(parseCliOptions([]).apply).toBeUndefined();
    await expect(importTenantBackup({ backup: { students: [] } })).rejects.toThrow(/no settings record/);
  });

  it('loadBackupFile parses a valid backup file and handles errors', () => {
    const fixturePath = 'server/tests/fixtures/synthetic-backup.json';
    const { backup, resolvedPath } = loadBackupFile(fixturePath);

    expect(resolvedPath).toContain('synthetic-backup.json');
    expect(backup.settings).toHaveLength(1);
    expect(backup.settings![0].schoolName).toBe('Devickys Gem Schools');
    expect(backup.classes).toHaveLength(1);
    expect(backup.subjects).toHaveLength(1);
    expect(backup.traits).toHaveLength(1);
    expect(backup.students).toHaveLength(1);

    expect(() => loadBackupFile('non-existent-backup.json')).toThrow(/not found/);
  });
});
