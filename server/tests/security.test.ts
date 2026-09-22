import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import prisma from '../src/lib/prisma.js';
import { createTenantDb, TenantIsolationError } from '../src/dal/tenantDb.js';
import { seedSuperadmin } from '../src/scripts/seedSuperadmin.js';
import { AUTH_COOKIE_NAME } from '../src/middleware/auth.js';
import { CSRF_COOKIE_NAME } from '../src/middleware/csrf.js';

describe('Security, Multi-Tenancy & RBAC Verification Suite', () => {
  let schoolAlpha: any;
  let schoolBeta: any;
  let adminAlphaToken: string;
  let adminBetaToken: string;
  let adminAlphaCookie: string;
  let adminBetaCookie: string;
  let adminAlphaCsrf: string;
  let adminBetaCsrf: string;

  let alice: any;
  let bob: any;
  let classAlpha: any;
  let classBeta: any;

  let teacherAlphaToken: string;
  let studentAliceToken: string;

  beforeAll(async () => {
    // 1. Seed database-backed superadmin
    await seedSuperadmin('superadmin@uprecord.local', 'SuperAdmin#2026!Secure');

    // 2. Register School Alpha
    const regAlpha = await request(app)
      .post('/api/auth/register')
      .send({
        schoolName: 'Alpha Academy',
        email: 'admin@alpha.edu',
        password: 'AdminPasswordAlpha123!',
        fullName: 'Principal Alpha',
      });

    expect(regAlpha.status).toBe(201);
    schoolAlpha = regAlpha.body.school;
    adminAlphaToken = regAlpha.body.token;

    // Extract cookies
    const rawCookiesAlpha = regAlpha.headers['set-cookie'] || [];
    const cookiesAlpha: string[] = Array.isArray(rawCookiesAlpha) ? rawCookiesAlpha : [rawCookiesAlpha];
    const authCookieAlpha = cookiesAlpha.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const csrfCookieAlpha = cookiesAlpha.find((c: string) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
    adminAlphaCookie = authCookieAlpha ? authCookieAlpha.split(';')[0] : '';
    adminAlphaCsrf = csrfCookieAlpha ? csrfCookieAlpha.split(';')[0].split('=')[1] : '';

    // 3. Register School Beta
    const regBeta = await request(app)
      .post('/api/auth/register')
      .send({
        schoolName: 'Beta High',
        email: 'admin@beta.edu',
        password: 'AdminPasswordBeta123!',
        fullName: 'Principal Beta',
      });

    expect(regBeta.status).toBe(201);
    schoolBeta = regBeta.body.school;
    adminBetaToken = regBeta.body.token;

    const rawCookiesBeta = regBeta.headers['set-cookie'] || [];
    const cookiesBeta: string[] = Array.isArray(rawCookiesBeta) ? rawCookiesBeta : [rawCookiesBeta];
    const authCookieBeta = cookiesBeta.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const csrfCookieBeta = cookiesBeta.find((c: string) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
    adminBetaCookie = authCookieBeta ? authCookieBeta.split(';')[0] : '';
    adminBetaCsrf = csrfCookieBeta ? csrfCookieBeta.split(';')[0].split('=')[1] : '';

    // 4. Create Class in School Alpha
    const classAlphaRes = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${adminAlphaToken}`)
      .send({ className: 'SS1 Alpha', level: 'Senior' });
    expect(classAlphaRes.status).toBe(201);
    classAlpha = classAlphaRes.body.class;

    // 5. Create Class in School Beta
    const classBetaRes = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${adminBetaToken}`)
      .send({ className: 'SS1 Beta', level: 'Senior' });
    expect(classBetaRes.status).toBe(201);
    classBeta = classBetaRes.body.class;

    // 6. Create Student Alice in School Alpha
    const aliceRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminAlphaToken}`)
      .send({
        admissionNumber: 'ALPHA-001',
        fullName: 'Alice Alpha',
        gender: 'Female',
        classId: classAlpha.id,
      });
    expect(aliceRes.status).toBe(201);
    alice = aliceRes.body.student;

    // 7. Create Student Bob in School Beta
    const bobRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminBetaToken}`)
      .send({
        admissionNumber: 'BETA-001',
        fullName: 'Bob Beta',
        gender: 'Male',
        classId: classBeta.id,
      });
    expect(bobRes.status).toBe(201);
    bob = bobRes.body.student;
  });

  // ─── 1. Cross-Tenant Isolation Tests ─────────────────────────────────

  describe('Tenant Isolation & IDOR Protection', () => {
    it('Tenant Alpha should list only its own students and never see Tenant Beta students', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminAlphaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.students.length).toBe(1);
      expect(res.body.students[0].id).toBe(alice.id);
      expect(res.body.students[0].fullName).toBe('Alice Alpha');

      // Verify Bob from Tenant Beta is NOT present
      const hasBob = res.body.students.some((s: any) => s.id === bob.id);
      expect(hasBob).toBe(false);
    });

    it('Tenant Beta should list only its own students and never see Tenant Alpha students', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminBetaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.students.length).toBe(1);
      expect(res.body.students[0].id).toBe(bob.id);
      expect(res.body.students[0].fullName).toBe('Bob Beta');

      const hasAlice = res.body.students.some((s: any) => s.id === alice.id);
      expect(hasAlice).toBe(false);
    });

    it('IDOR Read: Tenant Beta querying Alice by ID should return 404', async () => {
      const res = await request(app)
        .get(`/api/students/${alice.id}`)
        .set('Authorization', `Bearer ${adminBetaToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('IDOR Update: Tenant Beta attempting to modify Alice should return 404 and not alter DB', async () => {
      const res = await request(app)
        .put(`/api/students/${alice.id}`)
        .set('Authorization', `Bearer ${adminBetaToken}`)
        .send({ fullName: 'Alice Hacked By Beta' });

      expect(res.status).toBe(404);

      // Verify in DB that Alice was untouched
      const freshAlice = await prisma.student.findUnique({ where: { id: alice.id } });
      expect(freshAlice?.fullName).toBe('Alice Alpha');
    });

    it('IDOR Delete: Tenant Beta attempting to delete Alice should return 404 and Alice persists', async () => {
      const res = await request(app)
        .delete(`/api/students/${alice.id}`)
        .set('Authorization', `Bearer ${adminBetaToken}`);

      expect(res.status).toBe(404);

      const stillExists = await prisma.student.findUnique({ where: { id: alice.id } });
      expect(stillExists).not.toBeNull();
    });

    it('Parameter Tampering: Client injecting schoolId of another tenant is ignored by DAL', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminBetaToken}`)
        .send({
          admissionNumber: 'BETA-TAMPER',
          fullName: 'Tampered Student',
          gender: 'Male',
          classId: classBeta.id,
          schoolId: schoolAlpha.id, // Malicious injection attempting to write to School Alpha
        });

      expect(res.status).toBe(201);
      // Verify the student was created under School Beta (server-derived tenant), NOT School Alpha!
      expect(res.body.student.schoolId).toBe(schoolBeta.id);
      expect(res.body.student.schoolId).not.toBe(schoolAlpha.id);
    });

    it('Direct DAL Scoping: TenantDb throws TenantIsolationError on cross-tenant operations', async () => {
      const dalBeta = createTenantDb(schoolBeta.id);

      // findById for Alice (School Alpha) under dalBeta must return null
      const result = await dalBeta.students.findById(alice.id);
      expect(result).toBeNull();

      // Mutation under dalBeta on Alice must throw TenantIsolationError
      await expect(dalBeta.students.update(alice.id, { fullName: 'Direct Hack' }))
        .rejects.toThrow(TenantIsolationError);

      await expect(dalBeta.students.delete(alice.id))
        .rejects.toThrow(TenantIsolationError);
    });
  });

  // ─── 2. Server-Side RBAC Tests ───────────────────────────────────────

  describe('Role-Based Access Control (RBAC)', () => {
    let teacherAlpha: any;
    let studentAliceUser: any;

    beforeAll(async () => {
      // Create and activate Teacher in School Alpha
      const teacherRes = await request(app)
        .post('/api/auth/invite')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({
          email: 'teacher@alpha.edu',
          fullName: 'Mr. Teacher Alpha',
          role: 'teacher',
        });
      expect(teacherRes.status).toBe(201);

      await request(app)
        .post('/api/auth/setup-password')
        .send({
          token: teacherRes.body.setupToken,
          password: 'TeacherPassword123!',
        });

      const teacherLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'teacher@alpha.edu', password: 'TeacherPassword123!' });
      teacherAlphaToken = teacherLogin.body.token;

      // Create and activate Student User for Alice
      const studentRes = await request(app)
        .post('/api/auth/invite')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({
          email: 'alice@alpha.edu',
          fullName: 'Alice Alpha',
          role: 'student',
          studentId: alice.id,
        });
      expect(studentRes.status).toBe(201);

      await request(app)
        .post('/api/auth/setup-password')
        .send({
          token: studentRes.body.setupToken,
          password: 'AlicePassword123!',
        });

      const studentLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@alpha.edu', password: 'AlicePassword123!' });
      studentAliceToken = studentLogin.body.token;
    });

    it('Student cannot list school students (Staff only)', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${studentAliceToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Forbidden/i);
    });

    it('Student cannot create or delete students (Admin only)', async () => {
      const createRes = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${studentAliceToken}`)
        .send({
          admissionNumber: 'FORBIDDEN',
          fullName: 'Forbidden',
          gender: 'Male',
          classId: classAlpha.id,
        });
      expect(createRes.status).toBe(403);

      const deleteRes = await request(app)
        .delete(`/api/students/${alice.id}`)
        .set('Authorization', `Bearer ${studentAliceToken}`);
      expect(deleteRes.status).toBe(403);
    });

    it('Student can access their own student record by ID', async () => {
      const res = await request(app)
        .get(`/api/students/${alice.id}`)
        .set('Authorization', `Bearer ${studentAliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.student.id).toBe(alice.id);
    });

    it('Student cannot access other students by ID', async () => {
      // Create another student in Alpha
      const charlie = await prisma.student.create({
        data: {
          admissionNumber: 'ALPHA-002',
          fullName: 'Charlie Alpha',
          gender: 'Male',
          classId: classAlpha.id,
          schoolId: schoolAlpha.id,
        },
      });

      const res = await request(app)
        .get(`/api/students/${charlie.id}`)
        .set('Authorization', `Bearer ${studentAliceToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only permitted to access your own/i);
    });

    it('Teacher can view students and classes in their school', async () => {
      const studentsRes = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${teacherAlphaToken}`);
      expect(studentsRes.status).toBe(200);

      const classesRes = await request(app)
        .get('/api/classes')
        .set('Authorization', `Bearer ${teacherAlphaToken}`);
      expect(classesRes.status).toBe(200);
    });

    it('Teacher cannot create students or modify school settings (Admin only)', async () => {
      const studRes = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${teacherAlphaToken}`)
        .send({
          admissionNumber: 'TEACHER-FAIL',
          fullName: 'Fail',
          gender: 'Male',
          classId: classAlpha.id,
        });
      expect(studRes.status).toBe(403);

      const setRes = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${teacherAlphaToken}`)
        .send({ schoolName: 'Hacked Name' });
      expect(setRes.status).toBe(403);
    });

    it('Admin can modify school settings', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({ schoolSlogan: 'Updated Slogan for Alpha' });

      expect(res.status).toBe(200);
      expect(res.body.settings.schoolSlogan).toBe('Updated Slogan for Alpha');
    });

    it('Superadmin can log in and view platform-wide schools', async () => {
      const loginRes = await request(app)
        .post('/api/admin/login')
        .send({
          email: 'superadmin@uprecord.local',
          password: 'SuperAdmin#2026!Secure',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.role).toBe('superadmin');
      const superadminToken = loginRes.body.token;

      const schoolsRes = await request(app)
        .get('/api/admin/schools')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(schoolsRes.status).toBe(200);
      expect(schoolsRes.body.schools.length).toBeGreaterThanOrEqual(2);
    });

    it('Regular School Admin cannot access Superadmin platform schools endpoint', async () => {
      const res = await request(app)
        .get('/api/admin/schools')
        .set('Authorization', `Bearer ${adminAlphaToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── 3. HttpOnly Cookies & CSRF Protection Tests ─────────────────────

  describe('HttpOnly Cookie & CSRF Protection', () => {
    it('Login issues HttpOnly Secure SameSite cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@alpha.edu',
          password: 'AdminPasswordAlpha123!',
        });

      expect(res.status).toBe(200);
      const rawCookies = res.headers['set-cookie'] || [];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
      const authCookie = cookies.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));

      expect(authCookie).toBeDefined();
      expect(authCookie).toContain('HttpOnly');
      expect(authCookie).toContain('Path=/');
      expect(authCookie).toMatch(/SameSite=(Lax|Strict)/i);
    });

    it('State-modifying request with Cookie auth MUST provide matching X-CSRF-Token header', async () => {
      // Attempt mutation with cookie auth but WITHOUT X-CSRF-Token header -> Rejected
      const rejected = await request(app)
        .post('/api/students')
        .set('Cookie', [adminAlphaCookie, `${CSRF_COOKIE_NAME}=${adminAlphaCsrf}`])
        .send({
          admissionNumber: 'CSRF-TEST-1',
          fullName: 'CSRF Test Student',
          gender: 'Male',
          classId: classAlpha.id,
        });

      expect(rejected.status).toBe(403);
      expect(rejected.body.error).toMatch(/CSRF token/i);

      // Attempt with invalid CSRF token -> Rejected
      const invalidCsrf = await request(app)
        .post('/api/students')
        .set('Cookie', [adminAlphaCookie, `${CSRF_COOKIE_NAME}=${adminAlphaCsrf}`])
        .set('X-CSRF-Token', 'wrong-csrf-token')
        .send({
          admissionNumber: 'CSRF-TEST-2',
          fullName: 'CSRF Test Student',
          gender: 'Male',
          classId: classAlpha.id,
        });

      expect(invalidCsrf.status).toBe(403);

      // Attempt with VALID matching CSRF token -> Accepted
      const accepted = await request(app)
        .post('/api/students')
        .set('Cookie', [adminAlphaCookie, `${CSRF_COOKIE_NAME}=${adminAlphaCsrf}`])
        .set('X-CSRF-Token', adminAlphaCsrf)
        .send({
          admissionNumber: 'CSRF-VALID',
          fullName: 'Valid CSRF Student',
          gender: 'Male',
          classId: classAlpha.id,
        });

      expect(accepted.status).toBe(201);
      expect(accepted.body.student.admissionNumber).toBe('CSRF-VALID');
    });

    it('Bearer token requests bypass CSRF requirement (for API clients/mobile)', async () => {
      const res = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({
          admissionNumber: 'BEARER-TEST',
          fullName: 'Bearer Student',
          gender: 'Female',
          classId: classAlpha.id,
        });

      expect(res.status).toBe(201);
    });

    it('Logout clears the HttpOnly auth cookie', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [adminAlphaCookie]);

      expect(res.status).toBe(200);
      const rawCookies = res.headers['set-cookie'] || [];
      const cookies: string[] = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
      const clearedCookie = cookies.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
      expect(clearedCookie).toBeDefined();
      expect(clearedCookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
    });
  });

  // ─── 4. Activation & Password Setup Flow Tests ───────────────────────

  describe('Password Setup & Activation Flow', () => {
    let setupToken: string;

    it('Admin invites a user: creates pending_activation user with no passwordHash', async () => {
      const res = await request(app)
        .post('/api/auth/invite')
        .set('Authorization', `Bearer ${adminBetaToken}`)
        .send({
          email: 'newbie@beta.edu',
          fullName: 'Newbie Staff',
          role: 'teacher',
          department: 'Science',
        });

      expect(res.status).toBe(201);
      expect(res.body.user.status).toBe('pending_activation');
      expect(res.body.setupToken).toBeDefined();
      expect(res.body.setupUrl).toContain('/setup-password?token=');
      setupToken = res.body.setupToken;

      // Verify DB state: passwordHash must be null (no default password!)
      const dbUser = await prisma.user.findUnique({ where: { email: 'newbie@beta.edu' } });
      expect(dbUser?.passwordHash).toBeNull();
      expect(dbUser?.status).toBe('pending_activation');
    });

    it('User cannot log in before setting up their password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newbie@beta.edu',
          password: 'password123',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/awaiting initial password setup/i);
    });

    it('Verification endpoint returns user details for valid token', async () => {
      const res = await request(app)
        .get(`/api/auth/verify-setup-token?token=${setupToken}`);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.email).toBe('newbie@beta.edu');
      expect(res.body.fullName).toBe('Newbie Staff');
    });

    it('User sets their own password: activates account and logs in', async () => {
      const res = await request(app)
        .post('/api/auth/setup-password')
        .send({
          token: setupToken,
          password: 'MyVeryStrongNewPassword2026!',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.status).toBe('active');

      // Verify DB state
      const dbUser = await prisma.user.findUnique({ where: { email: 'newbie@beta.edu' } });
      expect(dbUser?.passwordHash).not.toBeNull();
      expect(dbUser?.status).toBe('active');
      expect(dbUser?.setupToken).toBeNull(); // Token invalidated after single use

      // Verify user can now log in with their newly chosen password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newbie@beta.edu',
          password: 'MyVeryStrongNewPassword2026!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.email).toBe('newbie@beta.edu');
    });
  });

  // ─── 5. Credentialed CORS & Custom Domain Tests ──────────────────────

  describe('CORS & Custom School Domains', () => {
    it('Allows configured CLIENT_URL with credentials', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('Allows custom school domain matching *.uprecord.edu with credentials', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://st-marys.uprecord.edu');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://st-marys.uprecord.edu');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('Rejects untrusted third-party origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil-phishing-site.com');

      // Express error handler catches CORS policy rejection
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/CORS Error/i);
    });
  });
});
