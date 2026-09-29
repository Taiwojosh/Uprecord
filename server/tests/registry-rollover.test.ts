import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/index.js';
import prisma from '../src/lib/prisma.js';

describe('Registry rollover, promotion and grouped history', () => {
  let school: any, other: any;
  let token: string, otherToken: string;
  let classJss1: any, classJss2: any, classSs1: any;
  let studentA: any, studentB: any, studentC: any;

  beforeAll(async () => {
    school = await prisma.school.create({ data: { name: 'Pilot Alpha College', slug: 'pilot-alpha-college' } });
    other = await prisma.school.create({ data: { name: 'Pilot Beta College', slug: 'pilot-beta-college' } });
    for (const [s, email] of [[school, 'alpha@pilot.test'], [other, 'beta@pilot.test']] as const) {
      await prisma.user.create({ data: { schoolId: s.id, email, fullName: 'Registry Admin', role: 'admin', passwordHash: await bcrypt.hash('PilotPassword#123', 10) } });
    }
    token = (await request(app).post('/api/auth/login').set('Host', 'localhost').send({ email: 'alpha@pilot.test', password: 'PilotPassword#123' })).body.token;
    otherToken = (await request(app).post('/api/auth/login').set('Host', 'localhost').send({ email: 'beta@pilot.test', password: 'PilotPassword#123' })).body.token;

    classJss1 = await prisma.class.create({ data: { schoolId: school.id, className: 'JSS 1', level: 'junior' } });
    classJss2 = await prisma.class.create({ data: { schoolId: school.id, className: 'JSS 2', level: 'junior' } });
    classSs1 = await prisma.class.create({ data: { schoolId: school.id, className: 'SS 1', level: 'senior' } });

    studentA = await prisma.student.create({ data: { schoolId: school.id, classId: classJss1.id, fullName: 'Alpha Student One', admissionNumber: 'PAC-0001', gender: 'Female' } });
    studentB = await prisma.student.create({ data: { schoolId: school.id, classId: classSs1.id, fullName: 'Alpha Student Two', admissionNumber: 'PAC-0002', gender: 'Male' } });
    studentC = await prisma.student.create({ data: { schoolId: school.id, classId: classJss1.id, fullName: 'Alpha Student Three', admissionNumber: 'PAC-0003', gender: 'Male' } });
    await prisma.schoolSettings.create({ data: { schoolId: school.id, schoolName: 'Pilot Alpha College', currentTerm: 2, currentSession: '2025/2026' } });
  });

  const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, auth?: string, host = 'localhost') =>
    request(app)[method](path).set('Host', host).set('Authorization', `Bearer ${auth || token}`);

  it('exposes school abbreviation, term info and subjects in the registry', async () => {
    const response = await api('get', '/api/registry');
    expect(response.status).toBe(200);
    expect(response.body.schoolInfo).toMatchObject({ name: 'Pilot Alpha College', abbreviation: 'PAC' });
    expect(response.body.termInfo).toMatchObject({ currentTerm: 2, currentSession: '2025/2026' });
    expect(Array.isArray(response.body.subjects)).toBe(true);
  });

  it('auto-generates an admission number using the school abbreviation for new students, leaving existing ones untouched', async () => {
    const created = await api('post', '/api/registry/students').send({ fullName: 'New Registrant', gender: 'Male', classId: classJss1.id });
    expect(created.status).toBe(201);
    expect(created.body.record.admissionNumber).toMatch(/^PAC-\d{4}$/);
    const stored = await prisma.student.findUnique({ where: { id: created.body.record.id } });
    expect(stored?.admissionNumber).toMatch(/^PAC-\d{4}$/);
    // Existing numbers are preserved on update (empty admissionNumber means "keep").
    const updated = await api('put', `/api/registry/students/${studentA.id}`).send({ fullName: 'Alpha Student One Renamed', gender: 'Female', classId: classJss1.id, admissionNumber: '' });
    expect(updated.status).toBe(200);
    const after = await prisma.student.findUnique({ where: { id: studentA.id } });
    expect(after?.admissionNumber).toBe('PAC-0001');
    expect(after?.fullName).toBe('Alpha Student One Renamed');
  });

  it('creates and isolates subjects per school', async () => {
    const created = await api('post', '/api/registry/subjects').send({ subjectName: 'Further Mathematics', isCore: true });
    expect(created.status).toBe(201);
    const inSchool = await api('get', '/api/registry');
    expect(inSchool.body.subjects.some((s: any) => s.subjectName === 'Further Mathematics')).toBe(true);
    const inOther = await api('get', '/api/registry', otherToken);
    expect(inOther.body.subjects.some((s: any) => s.subjectName === 'Further Mathematics')).toBe(false);
  });

  it('builds a rollover preview without mutating and applies the confirmed target', async () => {
    const preview = await api('post', '/api/registry/rollover/preview').send({});
    expect(preview.status).toBe(200);
    expect(preview.body.from).toMatchObject({ term: 2, session: '2025/2026' });
    expect(preview.body.to).toMatchObject({ term: 3, session: '2025/2026' });
    expect(preview.body.isSameSession).toBe(true);
    expect(preview.body.rollover.studentCount).toBe(4); // 3 pre-created + 1 auto-numbered
    // Nothing changed during preview.
    const settingsAfterPreview = await prisma.schoolSettings.findUnique({ where: { schoolId: school.id } });
    expect(settingsAfterPreview?.currentTerm).toBe(2);

    const applied = await api('post', '/api/registry/rollover/apply').send({ targetTerm: 3, targetSession: '2025/2026' });
    expect(applied.status).toBe(200);
    expect(applied.body.applied).toBe(true);
    const settingsAfterApply = await prisma.schoolSettings.findUnique({ where: { schoolId: school.id } });
    expect(settingsAfterApply?.currentTerm).toBe(3);

    // Re-applying the same term/session is rejected as already current.
    const duplicate = await api('post', '/api/registry/rollover/apply').send({ targetTerm: 3, targetSession: '2025/2026' });
    expect(duplicate.status).toBe(409);
  });

  it('previews promotions and keeps exceptions in their current class', async () => {
    const preview = await api('post', '/api/registry/promotion/preview').send({ targetSession: '2026/2027', exceptions: { [studentC.id]: 'skip' } });
    expect(preview.status).toBe(200);
    expect(preview.body.toSession).toBe('2026/2027');
    const moveA = preview.body.moves.find((m: any) => m.studentId === studentA.id);
    const moveB = preview.body.moves.find((m: any) => m.studentId === studentB.id);
    const moveC = preview.body.moves.find((m: any) => m.studentId === studentC.id);
    expect(moveA?.toClass?.id).toBe(classJss2.id);
    expect(moveA?.action).toBe('promote');
    expect(moveB?.action).toBe('graduate');
    expect(moveC?.action).toBe('skip');
  });

  it('applies a promotion plan with duplicate protection and tenant checks', async () => {
    const planned = await api('post', '/api/registry/promotion/apply').send({
      targetSession: '2026/2027',
      moves: [
        { studentId: studentA.id, toClassId: classJss2.id },
        { studentId: studentB.id, toClassId: null },
      ],
    });
    expect(planned.status).toBe(200);
    expect(planned.body.promoted).toBe(1);
    expect(planned.body.graduated).toBe(1);
    expect(planned.body.session).toBe('2026/2027');
    const afterA = await prisma.student.findUnique({ where: { id: studentA.id } });
    const afterB = await prisma.student.findUnique({ where: { id: studentB.id } });
    expect(afterA?.classId).toBe(classJss2.id);
    expect(afterB?.status).toBe('Graduated');

    // A student may appear only once in the plan.
    const duplicate = await api('post', '/api/registry/promotion/apply').send({
      moves: [
        { studentId: studentC.id, toClassId: classJss2.id },
        { studentId: studentC.id, toClassId: classSs1.id },
      ],
    });
    expect(duplicate.status).toBe(400);

    // A target class from another school is rejected.
    const otherClass = await prisma.class.create({ data: { schoolId: other.id, className: 'Other Class', level: 'junior' } });
    const foreign = await api('post', '/api/registry/promotion/apply').send({
      moves: [{ studentId: studentC.id, toClassId: otherClass.id }],
    });
    expect(foreign.status).toBe(400);
  });

  it('returns grouped history records by session and term', async () => {
    const subject = await prisma.subject.create({ data: { schoolId: school.id, subjectName: 'Mathematics' } });
    await prisma.grade.create({
      data: { schoolId: school.id, studentId: studentA.id, subjectId: subject.id, term: 1, session: '2024/2025', caScores: '{}', examScore: 78, total: 78, grade: 'A' },
    });
    const grouped = await api('get', '/api/registry/history?kind=grades&grouped=1');
    expect(grouped.status).toBe(200);
    expect(grouped.body.grouped).toBe(true);
    expect(Array.isArray(grouped.body.groups)).toBe(true);
    const session = grouped.body.groups.find((g: any) => g.session === '2024/2025');
    expect(session).toBeDefined();
    const term1 = session.terms.find((t: any) => t.term === 1);
    expect(term1?.count ?? 0).toBeGreaterThanOrEqual(1);
  });
});