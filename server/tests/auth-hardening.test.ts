import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/index.js';
import prisma from '../src/lib/prisma.js';
import { AUTH_COOKIE_NAME, signToken, type JwtPayload } from '../src/middleware/auth.js';
import { CSRF_COOKIE_NAME } from '../src/middleware/csrf.js';
import { resetRateLimitStore } from '../src/middleware/rateLimit.js';
import { getMailSink, clearMailSink, getLastSentEmail, sendSystemEmail } from '../src/lib/mailSink.js';
import { migrateInvitationTokens } from '../src/scripts/migrateInvitationTokens.js';
import { seedSuperadmin } from '../src/scripts/seedSuperadmin.js';

describe('GlobePen Native Authentication Hardening Suite', () => {
  let schoolAlpha: any;
  let schoolBeta: any;
  let adminAlphaToken: string;
  let adminAlphaCookie: string;
  let adminAlphaCsrf: string;
  let superadminToken: string;
  let superadminCookie: string;
  let superadminCsrf: string;

  const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION';

  beforeAll(async () => {
    // 1. Seed database-backed superadmin
    await seedSuperadmin('superadmin@uprecord.local', 'SuperAdmin#2026!Secure');
    const superadminLogin = await request(app)
      .post('/api/admin/login')
      .set('Host', 'localhost:3001')
      .send({
        email: 'superadmin@uprecord.local',
        password: 'SuperAdmin#2026!Secure',
      });
    expect(superadminLogin.status).toBe(200);
    superadminToken = superadminLogin.body.token;

    const superCookies = superadminLogin.headers['set-cookie'] || [];
    const superCookieArr = Array.isArray(superCookies) ? superCookies : [superCookies];
    const superAuth = superCookieArr.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const superCsrf = superCookieArr.find((c: string) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
    superadminCookie = superAuth ? superAuth.split(';')[0] : '';
    superadminCsrf = superCsrf ? superCsrf.split(';')[0].split('=')[1] : '';

    // 2. Register School Alpha
    const regAlpha = await request(app)
      .post('/api/auth/register')
      .set('Host', 'localhost:3001')
      .send({
        schoolName: 'Alpha Academy Hardened',
        email: 'admin@alphahardened.edu',
        password: 'AdminPasswordAlpha123!',
        fullName: 'Principal Alpha Hardened',
      });
    expect(regAlpha.status).toBe(201);
    schoolAlpha = regAlpha.body.school;
    adminAlphaToken = regAlpha.body.token;

    const alphaCookies = regAlpha.headers['set-cookie'] || [];
    const alphaCookieArr = Array.isArray(alphaCookies) ? alphaCookies : [alphaCookies];
    const alphaAuth = alphaCookieArr.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    const alphaCsrf = alphaCookieArr.find((c: string) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
    adminAlphaCookie = alphaAuth ? alphaAuth.split(';')[0] : '';
    adminAlphaCsrf = alphaCsrf ? alphaCsrf.split(';')[0].split('=')[1] : '';

    // 3. Register School Beta
    const regBeta = await request(app)
      .post('/api/auth/register')
      .set('Host', 'localhost:3001')
      .send({
        schoolName: 'Beta Academy Hardened',
        email: 'admin@betahardened.edu',
        password: 'AdminPasswordBeta123!',
        fullName: 'Principal Beta Hardened',
      });
    expect(regBeta.status).toBe(201);
    schoolBeta = regBeta.body.school;
  });

  beforeEach(() => {
    resetRateLimitStore();
    clearMailSink();
  });

  // ─── 1. CSRF Authentication Precedence & Route Matching ────────────

  describe('1. CSRF Authentication Precedence & Route Matching', () => {
    it('requires CSRF when auth cookie is present even if Bearer header is sent', async () => {
      // Attacker attempts to bypass CSRF on a cookie-authenticated request by providing a dummy Bearer header
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Host', 'localhost:3001')
        .set('Cookie', adminAlphaCookie)
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        // Deliberately omit X-CSRF-Token header
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/CSRF token missing/i);
    });

    it('permits non-ambient Bearer token requests without CSRF cookie', async () => {
      // API client using only Bearer token (no ambient cookie)
      const res = await request(app)
        .get('/api/auth/me')
        .set('Host', 'localhost:3001')
        .set('Authorization', `Bearer ${adminAlphaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('admin@alphahardened.edu');
    });

    it('enforces CSRF on logout because logout revokes sessions server-side', async () => {
      // Logout without CSRF header must be rejected
      const noCsrfRes = await request(app)
        .post('/api/auth/logout')
        .set('Host', 'localhost:3001')
        .set('Cookie', adminAlphaCookie)
        .send({});

      expect(noCsrfRes.status).toBe(403);
      expect(noCsrfRes.body.error).toMatch(/CSRF token missing/i);
    });

    it('uses exact public route matching so near-miss paths are not exempt from CSRF', async () => {
      const res = await request(app)
        .post('/api/auth/login-arbitrary')
        .set('Host', 'localhost:3001')
        .set('Cookie', adminAlphaCookie)
        .send({});

      // Since /api/auth/login-arbitrary is not exactly in publicPaths, it requires CSRF and returns 403
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/CSRF token missing/i);
    });
  });

  // ─── 2. School Binding Preservation & tokenVersion Enforcement ─────

  describe('2. Preserve School Binding & tokenVersion Enforcement', () => {
    it('rejects tokens when user school membership changes in DB (no silent upgrade)', async () => {
      // 1. Create a user at School Alpha and log in
      const tempUser = await prisma.user.create({
        data: {
          email: 'transfer.teacher@alphahardened.edu',
          passwordHash: await bcrypt.hash('TeacherPass123!', 12),
          fullName: 'Transfer Teacher',
          role: 'teacher',
          schoolId: schoolAlpha.id,
          status: 'active',
          tokenVersion: 0,
        },
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Host', 'localhost:3001')
        .send({
          email: 'transfer.teacher@alphahardened.edu',
          password: 'TeacherPass123!',
        });
      expect(loginRes.status).toBe(200);
      const alphaToken = loginRes.body.token;

      // Verify token works for Alpha
      const meBefore = await request(app)
        .get('/api/auth/me')
        .set('Host', 'localhost:3001')
        .set('Authorization', `Bearer ${alphaToken}`);
      expect(meBefore.status).toBe(200);
      expect(meBefore.body.user.schoolId).toBe(schoolAlpha.id);

      // 2. Reassign user to School Beta in database without issuing a new token
      await prisma.user.update({
        where: { id: tempUser.id },
        data: { schoolId: schoolBeta.id },
      });

      // 3. Old session MUST be rejected with 401; must NOT silently upgrade to School Beta
      const meAfter = await request(app)
        .get('/api/auth/me')
        .set('Host', 'localhost:3001')
        .set('Authorization', `Bearer ${alphaToken}`);

      expect(meAfter.status).toBe(401);
      expect(meAfter.body.error).toMatch(/Session school membership mismatch/i);
    });

    it('rejects legacy tokens without tokenVersion claim with HTTP 401', async () => {
      // Create a legacy token without tokenVersion claim
      const legacyPayload = {
        userId: 99999,
        email: 'legacy@uprecord.local',
        role: 'admin',
        schoolId: schoolAlpha.id,
        isAdmin: true,
        // tokenVersion is deliberately omitted
      };
      const legacyToken = jwt.sign(legacyPayload, JWT_SECRET, { expiresIn: '1h' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Host', 'localhost:3001')
        .set('Authorization', `Bearer ${legacyToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Legacy session without token version/i);
    });
  });

  // ─── 3. Atomic Token Consumption & Concurrency ─────────────────────

  describe('3. Atomic Token Consumption & Concurrency', () => {
    it('read-only GET verification does not consume activation tokens', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.user.create({
        data: {
          email: 'get.verify.user@alphahardened.edu',
          fullName: 'Verify User',
          role: 'teacher',
          schoolId: schoolAlpha.id,
          status: 'pending_activation',
          setupTokenHash: tokenHash,
          setupTokenExpires: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      // GET verify twice
      const res1 = await request(app)
        .get(`/api/auth/verify-setup-token?token=${rawToken}`)
        .set('Host', 'localhost:3001');
      expect(res1.status).toBe(200);
      expect(res1.body.valid).toBe(true);

      const res2 = await request(app)
        .get(`/api/auth/verify-setup-token?token=${rawToken}`)
        .set('Host', 'localhost:3001');
      expect(res2.status).toBe(200);
      expect(res2.body.valid).toBe(true);

      // Verify token is still intact in DB
      const userInDb = await prisma.user.findFirst({ where: { setupTokenHash: tokenHash } });
      expect(userInDb).not.toBeNull();
      expect(userInDb?.setupTokenHash).toBe(tokenHash);
    });

    it('concurrent password setup requests: only one succeeds', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.user.create({
        data: {
          email: 'concurrent.activation@alphahardened.edu',
          fullName: 'Concurrent Activation',
          role: 'teacher',
          schoolId: schoolAlpha.id,
          status: 'pending_activation',
          setupTokenHash: tokenHash,
          setupTokenExpires: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      // Fire 2 concurrent requests
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/auth/setup-password')
          .set('Host', 'localhost:3001')
          .send({ token: rawToken, password: 'ConcurrentPass123!' }),
        request(app)
          .post('/api/auth/setup-password')
          .set('Host', 'localhost:3001')
          .send({ token: rawToken, password: 'ConcurrentPass123!' }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      // Token must now be consumed
      const userAfter = await prisma.user.findFirst({ where: { email: 'concurrent.activation@alphahardened.edu' } });
      expect(userAfter?.setupTokenHash).toBeNull();
      expect(userAfter?.status).toBe('active');
    });

    it('concurrent password reset requests: only one succeeds', async () => {
      const rawResetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');

      const user = await prisma.user.create({
        data: {
          email: 'concurrent.reset@alphahardened.edu',
          passwordHash: await bcrypt.hash('OldPassword123!', 12),
          fullName: 'Concurrent Reset User',
          role: 'teacher',
          schoolId: schoolAlpha.id,
          status: 'active',
          resetTokenHash,
          resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Concurrent reset submissions
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/auth/reset-password')
          .set('Host', 'localhost:3001')
          .send({ token: rawResetToken, password: 'NewPassword123!' }),
        request(app)
          .post('/api/auth/reset-password')
          .set('Host', 'localhost:3001')
          .send({ token: rawResetToken, password: 'NewPassword123!' }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      // Token is consumed
      const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
      expect(userAfter?.resetTokenHash).toBeNull();
      expect(userAfter?.tokenVersion).toBeGreaterThan(0);
    });
  });

  // ─── 4. Plaintext Invitation Token Migration ───────────────────────

  describe('4. Plaintext Invitation Token Migration', () => {
    it('migrates plaintext setupToken to setupTokenHash and clears plaintext column', async () => {
      const plaintextToken = 'legacy-plain-token-abc-12345';
      const expectedHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');

      const legacyUser = await prisma.user.create({
        data: {
          email: 'legacy.migration.user@alphahardened.edu',
          fullName: 'Legacy User',
          role: 'teacher',
          schoolId: schoolAlpha.id,
          status: 'pending_activation',
          setupToken: plaintextToken, // Plaintext stored in legacy column
          setupTokenHash: null,
          setupTokenExpires: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      // Run migration script
      const { migratedCount } = await migrateInvitationTokens();
      expect(migratedCount).toBeGreaterThanOrEqual(1);

      // Verify in DB: setupToken is null, setupTokenHash has correct SHA-256
      const migratedUser = await prisma.user.findUnique({ where: { id: legacyUser.id } });
      expect(migratedUser?.setupToken).toBeNull();
      expect(migratedUser?.setupTokenHash).toBe(expectedHash);

      // Verify raw invitation link still functions via GET verify
      const verifyRes = await request(app)
        .get(`/api/auth/verify-setup-token?token=${plaintextToken}`)
        .set('Host', 'localhost:3001');
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.valid).toBe(true);
    });
  });

  // ─── 5. Dual Rate Limiting (IP & Normalized Account) ────────────────

  describe('5. Dual Rate Limiting (IP & Normalized Account)', () => {
    it('enforces account limit after 5 failed login attempts for the same email', async () => {
      const targetEmail = 'brute.target@alphahardened.edu';

      // 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .set('Host', 'localhost:3001')
          .send({ email: targetEmail, password: 'WrongPassword!' });
        expect(res.status).toBe(401);
      }

      // 6th attempt must be blocked by rate limiter with 429
      const blockedRes = await request(app)
        .post('/api/auth/login')
        .set('Host', 'localhost:3001')
        .send({ email: `  ${targetEmail.toUpperCase()}  `, password: 'WrongPassword!' }); // tests email normalization!

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.reason).toBe('account_limit_exceeded');
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });

    it('enforces rate limits on platform admin login', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/admin/login')
          .set('Host', 'localhost:3001')
          .send({ email: 'superadmin@uprecord.local', password: 'WrongAdminPassword!' });
        expect(res.status).toBe(401);
      }

      const blocked = await request(app)
        .post('/api/admin/login')
        .set('Host', 'localhost:3001')
        .send({ email: 'superadmin@uprecord.local', password: 'WrongAdminPassword!' });

      expect(blocked.status).toBe(429);
      expect(blocked.body.reason).toBe('account_limit_exceeded');
    });
  });

  // ─── 6. Response Policy & Anti-Enumeration Integrity ───────────────

  describe('6. Response Policy & Anti-Enumeration Integrity', () => {
    it('returns uniform 200 response for non-existent, wrong-school, and active accounts on forgot-password', async () => {
      // 1. Non-existent account
      const resNonExistent = await request(app)
        .post('/api/auth/forgot-password')
        .set('Host', 'localhost:3001')
        .send({ email: 'doesnotexist@anywhere.com' });

      expect(resNonExistent.status).toBe(200);
      expect(resNonExistent.body.message).toMatch(/If an account is associated with that email/i);

      // 2. Wrong-school account on school portal
      const alphaSchool = await prisma.school.findUnique({ where: { id: schoolAlpha.id } });
      const resWrongSchool = await request(app)
        .post('/api/auth/forgot-password')
        .set('Host', `${alphaSchool!.slug}.localhost:3001`) // on Alpha portal
        .send({ email: 'admin@betahardened.edu' }); // belongs to Beta

      // Must return identical 200 message; NOT 403!
      expect(resWrongSchool.status).toBe(200);
      expect(resWrongSchool.body).toEqual(resNonExistent.body);

      // 3. Active valid account
      const resValid = await request(app)
        .post('/api/auth/forgot-password')
        .set('Host', 'localhost:3001')
        .send({ email: 'admin@alphahardened.edu' });

      expect(resValid.status).toBe(200);
      expect(resValid.body).toEqual(resNonExistent.body);
    });

    it('returns uniform 401 error message for non-existent email and wrong password', async () => {
      const resWrongEmail = await request(app)
        .post('/api/auth/login')
        .set('Host', 'localhost:3001')
        .send({ email: 'nobody@nowhere.edu', password: 'SomePassword123!' });

      const resWrongPass = await request(app)
        .post('/api/auth/login')
        .set('Host', 'localhost:3001')
        .send({ email: 'admin@alphahardened.edu', password: 'WrongPassword123!' });

      expect(resWrongEmail.status).toBe(401);
      expect(resWrongPass.status).toBe(401);
      expect(resWrongEmail.body).toEqual(resWrongPass.body);
      expect(resWrongEmail.body.error).toBe('Invalid email or password.');
    });
  });

  // ─── 7. Central Platform Portal Recovery & Mail Sink Security ───────

  describe('7. Central Platform Portal Recovery & Mail Sink Security', () => {
    it('allows school users to request password recovery from central platform portal', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .set('Host', 'localhost:3001') // central platform host
        .send({ email: 'admin@alphahardened.edu' });

      expect(res.status).toBe(200);

      // Verify email was captured in development sink
      const lastEmail = getLastSentEmail();
      expect(lastEmail).toBeDefined();
      expect(lastEmail?.to).toBe('admin@alphahardened.edu');
      expect(lastEmail?.link).toContain('/reset-password?token=');
      // Origin must be approved (http://localhost:3000)
      expect(lastEmail?.link).toMatch(/http:\/\/localhost:3000\/reset-password\?token=[a-f0-9]{64}/);
    });

    it('fails safe in production if SMTP is not configured', async () => {
      const origEnv = process.env.NODE_ENV;
      const origSmtp = process.env.SMTP_HOST;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.SMTP_HOST;

        await expect(
          sendSystemEmail({
            to: 'test@prod.edu',
            subject: 'Prod Test',
            template: 'password-reset',
            link: 'https://globepen.app/reset-password?token=123',
          })
        ).rejects.toThrow(/Production email provider is not configured/i);
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origSmtp) process.env.SMTP_HOST = origSmtp;
      }
    });
  });

  // ─── 8. Multi-Device Revocation on Logout & Credential Changes ───────

  describe('8. Server-Side Session Revocation on Logout & Multi-Device Semantics', () => {
    it('logout revokes all active sessions across all devices for that user', async () => {
      // 1. Create a user
      const user = await prisma.user.create({
        data: {
          email: 'multidevice@alphahardened.edu',
          passwordHash: await bcrypt.hash('DevicePass123!', 12),
          fullName: 'Multi Device User',
          role: 'teacher',
          schoolId: schoolAlpha.id,
          status: 'active',
          tokenVersion: 0,
        },
      });

      // 2. Login from Device A
      const loginA = await request(app)
        .post('/api/auth/login')
        .set('Host', 'localhost:3001')
        .send({ email: 'multidevice@alphahardened.edu', password: 'DevicePass123!' });
      expect(loginA.status).toBe(200);
      const tokenA = loginA.body.token;

      // Extract CSRF and cookie from loginA
      const cookiesA = loginA.headers['set-cookie'] || [];
      const cookieArrA = Array.isArray(cookiesA) ? cookiesA : [cookiesA];
      const authCookieA = cookieArrA.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`))?.split(';')[0] || '';
      const csrfTokenA = cookieArrA.find((c: string) => c.startsWith(`${CSRF_COOKIE_NAME}=`))?.split(';')[0].split('=')[1] || '';

      // 3. Login from Device B (simulated: receives token with same initial tokenVersion)
      const tokenB = tokenA;

      // Both can access /api/auth/me
      const checkA1 = await request(app)
        .get('/api/auth/me')
        .set('Host', 'localhost:3001')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(checkA1.status).toBe(200);

      const checkB1 = await request(app)
        .get('/api/auth/me')
        .set('Host', 'localhost:3001')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(checkB1.status).toBe(200);

      // 4. Device A logs out (providing auth cookie + CSRF cookie + valid CSRF header)
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Host', 'localhost:3001')
        .set('Cookie', [authCookieA, `${CSRF_COOKIE_NAME}=${csrfTokenA}`])
        .set('X-CSRF-Token', csrfTokenA)
        .send({});
      expect(logoutRes.status).toBe(200);

      // In database, tokenVersion was incremented
      const userInDb = await prisma.user.findUnique({ where: { id: user.id } });
      expect(userInDb?.tokenVersion).toBe(1);

      // 5. Device B's session is now instantly invalid on its next request!
      const checkB2 = await request(app)
        .get('/api/auth/me')
        .set('Host', 'localhost:3001')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(checkB2.status).toBe(401);
      expect(checkB2.body.error).toMatch(/Session has expired or was revoked/i);
    });

    it('rejects suspended users on next request despite valid unexpired token', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'suspend.test@alphahardened.edu',
          passwordHash: await bcrypt.hash('SuspendPass123!', 12),
          fullName: 'Suspend Test',
          role: 'teacher',
          schoolId: schoolAlpha.id,
          status: 'active',
          tokenVersion: 0,
        },
      });

      const login = await request(app)
        .post('/api/auth/login')
        .set('Host', 'localhost:3001')
        .send({ email: 'suspend.test@alphahardened.edu', password: 'SuspendPass123!' });
      const activeToken = login.body.token;

      // Access succeeds
      const beforeRes = await request(app)
        .get('/api/auth/me')
        .set('Host', 'localhost:3001')
        .set('Authorization', `Bearer ${activeToken}`);
      expect(beforeRes.status).toBe(200);

      // Admin suspends user
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'suspended' },
      });

      // Next request immediately rejected
      const afterRes = await request(app)
        .get('/api/auth/me')
        .set('Host', 'localhost:3001')
        .set('Authorization', `Bearer ${activeToken}`);

      expect(afterRes.status).toBe(401);
      expect(afterRes.body.error).toMatch(/Account is inactive or suspended/i);
    });
  });
});
