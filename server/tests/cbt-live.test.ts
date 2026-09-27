import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/index.js';
import prisma from '../src/lib/prisma.js';
import { signToken } from '../src/middleware/auth.js';
import { resetTestDatabase } from './setup.js';

describe('CBT & Live Classroom Suite', () => {
  let schoolA: any, schoolB: any;
  let teacherA: any, studentA: any, studentB: any;
  let classA: any, classB: any;
  let teacherToken: string, studentToken: string, wrongSchoolStudentToken: string;

  beforeAll(async () => {
    await resetTestDatabase();

    // 1. Create two schools for tenant isolation tests
    schoolA = await prisma.school.create({ data: { name: 'Devickys School A', slug: 'devickys-a' } });
    schoolB = await prisma.school.create({ data: { name: 'Other School B', slug: 'other-b' } });

    // 2. Create users
    const passwordHash = await bcrypt.hash('SecretPass#2026', 10);
    teacherA = await prisma.user.create({
      data: {
        schoolId: schoolA.id,
        email: 'teacher@devickys.test',
        fullName: 'Mr. Devickys Teacher',
        role: 'teacher',
        passwordHash,
        status: 'active',
      },
    });

    // 3. Create classes
    classA = await prisma.class.create({
      data: {
        schoolId: schoolA.id,
        className: 'Basic 5 Gold',
        level: 'Primary',
        teacherId: teacherA.id,
      },
    });

    classB = await prisma.class.create({
      data: {
        schoolId: schoolB.id,
        className: 'JSS 1 Green',
        level: 'Secondary',
      },
    });

    // 4. Create students
    const pupilA = await prisma.student.create({
      data: {
        schoolId: schoolA.id,
        classId: classA.id,
        fullName: 'John Pupil',
        admissionNumber: 'DEV-001',
        gender: 'Male',
        status: 'Active',
      },
    });

    studentA = await prisma.user.create({
      data: {
        schoolId: schoolA.id,
        email: 'student@devickys.test',
        fullName: 'John Pupil',
        role: 'student',
        studentId: pupilA.id,
        passwordHash,
        status: 'active',
      },
    });

    const pupilB = await prisma.student.create({
      data: {
        schoolId: schoolB.id,
        classId: classB.id,
        fullName: 'Jane Other',
        admissionNumber: 'OTH-001',
        gender: 'Female',
        status: 'Active',
      },
    });

    studentB = await prisma.user.create({
      data: {
        schoolId: schoolB.id,
        email: 'student@other.test',
        fullName: 'Jane Other',
        role: 'student',
        studentId: pupilB.id,
        passwordHash,
        status: 'active',
      },
    });

    // 5. Generate signed JWT tokens
    teacherToken = signToken({
      userId: teacherA.id,
      email: teacherA.email,
      role: teacherA.role,
      schoolId: schoolA.id,
      isAdmin: false,
      tokenVersion: teacherA.tokenVersion,
    });

    studentToken = signToken({
      userId: studentA.id,
      email: studentA.email,
      role: studentA.role,
      schoolId: schoolA.id,
      studentId: pupilA.id,
      isAdmin: false,
      tokenVersion: studentA.tokenVersion,
    });

    wrongSchoolStudentToken = signToken({
      userId: studentB.id,
      email: studentB.email,
      role: studentB.role,
      schoolId: schoolB.id,
      studentId: pupilB.id,
      isAdmin: false,
      tokenVersion: studentB.tokenVersion,
    });
  });

  const api = (token?: string) => ({
    get: (url: string) => request(app).get(url).set('Host', 'localhost').set('Authorization', `Bearer ${token}`),
    post: (url: string, body: any) => request(app).post(url).set('Host', 'localhost').set('Authorization', `Bearer ${token}`).send(body),
    put: (url: string, body: any) => request(app).put(url).set('Host', 'localhost').set('Authorization', `Bearer ${token}`).send(body),
    delete: (url: string) => request(app).delete(url).set('Host', 'localhost').set('Authorization', `Bearer ${token}`),
  });

  describe('Live Classroom (Dual Mode: External & Embedded)', () => {
    let lessonId: string;

    it('GET /api/live reports embeddedAvailable false when unconfigured and lists classes', async () => {
      const res = await api(teacherToken).get('/api/live');
      expect(res.status).toBe(200);
      expect(res.body.embeddedAvailable).toBe(false);
      expect(res.body.canManage).toBe(true);
      expect(res.body.classes).toEqual(expect.arrayContaining([expect.objectContaining({ id: classA.id })]));
    });

    it('POST /api/live rejects scheduling by non-staff (students)', async () => {
      const res = await api(studentToken).post('/api/live', {
        title: 'Unauthorized student session',
        classId: classA.id,
        startsAt: new Date(Date.now() + 3600_000).toISOString(),
        durationMinutes: 40,
        mode: 'external',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
      });
      expect(res.status).toBe(403);
    });

    it('POST /api/live validates external meeting URL format', async () => {
      const res = await api(teacherToken).post('/api/live', {
        title: 'Maths Live Revision',
        classId: classA.id,
        startsAt: new Date(Date.now() + 3600_000).toISOString(),
        durationMinutes: 40,
        mode: 'external',
        meetingUrl: 'https://phishing-site.example.com/not-allowed',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Use an HTTPS Google Meet or Zoom meeting link');
    });

    it('POST /api/live rejects embedded mode gracefully with 503 if LiveKit is unconfigured', async () => {
      const res = await api(teacherToken).post('/api/live', {
        title: 'Maths In-App Video',
        classId: classA.id,
        startsAt: new Date(Date.now() + 3600_000).toISOString(),
        durationMinutes: 40,
        mode: 'embedded',
      });
      expect(res.status).toBe(503);
      expect(res.body.error).toContain('In-app video is awaiting server setup');
    });

    it('POST /api/live successfully schedules an external Google Meet classroom', async () => {
      const res = await api(teacherToken).post('/api/live', {
        title: 'Basic 5 Mathematics Revision',
        classId: classA.id,
        startsAt: new Date(Date.now() + 3600_000).toISOString(),
        durationMinutes: 45,
        mode: 'external',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      lessonId = res.body.id;
    });

    it('POST /api/live/:id/join rejects joining before teacher starts the class', async () => {
      const res = await api(studentToken).post(`/api/live/${lessonId}/join`, {});
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Wait for your teacher to start the class');
    });

    it('POST /api/live/:id/start allows teacher to transition class to live', async () => {
      const res = await api(teacherToken).post(`/api/live/${lessonId}/start`, {});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('live');
    });

    it('POST /api/live/:id/join allows student in that class to join and receive external URL', async () => {
      const res = await api(studentToken).post(`/api/live/${lessonId}/join`, {});
      expect(res.status).toBe(200);
      expect(res.body.mode).toBe('external');
      expect(res.body.url).toBe('https://meet.google.com/abc-defg-hij');
    });

    it('POST /api/live/:id/join rejects student from a different class / school', async () => {
      const res = await api(wrongSchoolStudentToken).post(`/api/live/${lessonId}/join`, {});
      expect(res.status).toBe(404);
    });

    it('POST /api/live/:id/end transitions lesson to ended', async () => {
      const res = await api(teacherToken).post(`/api/live/${lessonId}/end`, {});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ended');

      // Attempting to join an ended class fails
      const joinRes = await api(studentToken).post(`/api/live/${lessonId}/join`, {});
      expect(joinRes.status).toBe(409);
    });
  });

  describe('CBT (Computer-Based Testing)', () => {
    let assessmentId: string;

    const sampleQuestions = [
      {
        prompt: 'What is 15 + 27?',
        options: ['40', '42', '45', '52'],
        correct: 1, // '42'
      },
      {
        prompt: 'Which planet is known as the Red Planet?',
        options: ['Earth', 'Mars', 'Jupiter', 'Venus'],
        correct: 1, // 'Mars'
      },
    ];

    it('POST /api/cbt rejects assessment creation by students', async () => {
      const res = await api(studentToken).post('/api/cbt', {
        title: 'Unauthorized Student Quiz',
        classId: classA.id,
        durationMinutes: 20,
        questions: sampleQuestions,
      });
      expect(res.status).toBe(403);
    });

    it('POST /api/cbt creates a draft assessment for teacher', async () => {
      const res = await api(teacherToken).post('/api/cbt', {
        title: 'First Term Mathematics Assessment',
        classId: classA.id,
        durationMinutes: 30,
        questions: sampleQuestions,
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      assessmentId = res.body.id;
    });

    it('GET /api/cbt shows draft to teacher, but hides draft from students', async () => {
      const teacherRes = await api(teacherToken).get('/api/cbt');
      expect(teacherRes.status).toBe(200);
      expect(teacherRes.body.assessments).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: assessmentId, published: false })])
      );

      const studentRes = await api(studentToken).get('/api/cbt');
      expect(studentRes.status).toBe(200);
      // Student should not see unpublished drafts
      const found = studentRes.body.assessments.find((a: any) => a.id === assessmentId);
      expect(found).toBeUndefined();
    });

    it('POST /api/cbt/:id/publish allows teacher to publish assessment', async () => {
      const res = await api(teacherToken).post(`/api/cbt/${assessmentId}/publish`, {});
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      // Now student should see it
      const studentRes = await api(studentToken).get('/api/cbt');
      const found = studentRes.body.assessments.find((a: any) => a.id === assessmentId);
      expect(found).toBeDefined();
      expect(found.title).toBe('First Term Mathematics Assessment');
      expect(found.questionCount).toBe(2);
    });

    it('POST /api/cbt/:id/attempt starts student test attempt and hides correct answers', async () => {
      const res = await api(studentToken).post(`/api/cbt/${assessmentId}/attempt`, {});
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.expiresAt).toBeDefined();
      expect(res.body.serverNow).toBeDefined();
      expect(res.body.questions).toHaveLength(2);

      // Anti-cheating invariant: correct answer index must NEVER be exposed in student attempt payload!
      expect(res.body.questions[0].correct).toBeUndefined();
      expect(res.body.questions[1].correct).toBeUndefined();
    });

    it('PUT /api/cbt/:id/attempt autosaves answers', async () => {
      const res = await api(studentToken).put(`/api/cbt/${assessmentId}/attempt`, {
        answers: { '0': 1 }, // answered question 0 correctly ('42')
        submit: false,
      });
      expect(res.status).toBe(200);
      expect(res.body.answers).toEqual({ '0': 1 });
      expect(res.body.submittedAt).toBeNull();
    });

    it('PUT /api/cbt/:id/attempt submits and automatically grades the assessment', async () => {
      const res = await api(studentToken).put(`/api/cbt/${assessmentId}/attempt`, {
        answers: { '0': 1, '1': 1 }, // both answers correct (2/2)
        submit: true,
      });
      expect(res.status).toBe(200);
      expect(res.body.submittedAt).not.toBeNull();
      expect(res.body.score).toBe(2);
    });

    it('POST /api/cbt/:id/attempt returns already submitted attempt on subsequent call', async () => {
      const res = await api(studentToken).post(`/api/cbt/${assessmentId}/attempt`, {});
      expect(res.status).toBe(200);
      expect(res.body.submittedAt).not.toBeNull();
      expect(res.body.score).toBe(2);
    });

    it('GET /api/cbt/:id/results allows teacher to view student results and scores', async () => {
      const res = await api(teacherToken).get(`/api/cbt/${assessmentId}/results`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].studentName).toBe('John Pupil');
      expect(res.body.results[0].score).toBe(2);
    });

    it('Cross-tenant isolation: user from School B cannot access School A assessment', async () => {
      const res = await api(wrongSchoolStudentToken).get(`/api/cbt/${assessmentId}/results`);
      expect(res.status).toBe(404);
    });
  });
});
