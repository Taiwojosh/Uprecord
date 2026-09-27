import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import dns from 'node:dns';
import request from 'supertest';
import app from '../src/index.js';
import prisma from '../src/lib/prisma.js';
import { resetTestDatabase } from './setup.js';
import { seedSuperadmin } from '../src/scripts/seedSuperadmin.js';

describe('GlobePen Multi-Tenancy, Hostname Resolution & Branding Suite', () => {
  afterEach(() => vi.restoreAllMocks());
  let schoolAlpha: any;
  let schoolBeta: any;
  let adminAlphaToken: string;
  let adminBetaToken: string;
  let adminAlphaCookies: string[];
  let alphaCsrfToken: string;
  const userAlphaEmail = 'admin@alpha-academy.edu';
  const userBetaEmail = 'admin@beta-academy.edu';

  beforeAll(async () => {
    await resetTestDatabase();
    await seedSuperadmin('superadmin@uprecord.local', 'SuperAdmin#2026!Secure');

    // 1. Register School Alpha on platform host
    const regAlpha = await request(app)
      .post('/api/auth/register')
      .set('Host', 'localhost')
      .send({
        schoolName: 'Alpha Academy',
        email: userAlphaEmail,
        password: 'Password123!',
        fullName: 'Alpha Principal',
        address: '10 Alpha Way',
      });
    expect(regAlpha.status).toBe(201);
    schoolAlpha = regAlpha.body.school;
    adminAlphaToken = regAlpha.body.token;

    // Save Alpha's slug (should be 'alpha-academy')
    const freshAlpha = await prisma.school.findUnique({ where: { id: schoolAlpha.id } });
    expect(freshAlpha?.slug).toBe('alpha-academy');

    // 2. Register School Beta on platform host
    const regBeta = await request(app)
      .post('/api/auth/register')
      .set('Host', 'localhost')
      .send({
        schoolName: 'Beta College',
        email: userBetaEmail,
        password: 'Password123!',
        fullName: 'Beta Dean',
        address: '20 Beta Road',
      });
    expect(regBeta.status).toBe(201);
    schoolBeta = regBeta.body.school;
    adminBetaToken = regBeta.body.token;

    // Log in Alpha on platform host to get cookie and CSRF
    const loginAlpha = await request(app)
      .post('/api/auth/login')
      .set('Host', 'localhost')
      .send({ email: userAlphaEmail, password: 'Password123!' });
    expect(loginAlpha.status).toBe(200);
    adminAlphaCookies = loginAlpha.headers['set-cookie'] as unknown as string[];

    const csrfRes = await request(app).get('/api/auth/csrf').set('Host', 'localhost');
    alphaCsrfToken = csrfRes.body.csrfToken;
  });

  describe('1. Hostname Resolution & Proxy Trust', () => {
    it('Rejects unknown hosts and unknown school subdomains with 404', async () => {
      const res = await request(app)
        .get('/api/schools/branding')
        .set('Host', 'unknown-random-school.com');

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Unrecognized host/i);

      const subRes = await request(app)
        .get('/api/schools/branding')
        .set('Host', 'nonexistent-school.localhost');

      expect(subRes.status).toBe(404);
      expect(subRes.body.error).toMatch(/does not exist/i);
    });

    it('Ignores spoofed X-Forwarded-Host from untrusted connections', async () => {
      // Direct connection with Host: localhost and spoofed X-Forwarded-Host
      const res = await request(app)
        .get('/api/schools/branding')
        .set('Host', 'localhost')
        .set('X-Forwarded-Host', 'malicious-injected-host.com');

      // Server should resolve as platform host 'localhost', not the spoofed header
      expect(res.status).toBe(200);
      expect(res.body.branding.schoolName).toBe('GlobePen');
    });

    it('Resolves school subdomain from Host header', async () => {
      const res = await request(app)
        .get('/api/schools/branding')
        .set('Host', 'alpha-academy.localhost');

      expect(res.status).toBe(200);
      expect(res.body.branding.schoolId).toBe(schoolAlpha.id);
      expect(res.body.branding.schoolName).toBe('Alpha Academy');
      expect(res.body.branding.poweredBy).toBe('GlobePen');
    });
  });

  describe('2. Branding Integrity & Public Scope', () => {
    it('Returns strictly approved public branding fields without leaking private data', async () => {
      const res = await request(app)
        .get('/api/schools/branding')
        .set('Host', 'alpha-academy.localhost');

      expect(res.status).toBe(200);
      const b = res.body.branding;
      expect(b).toHaveProperty('schoolName');
      expect(b).toHaveProperty('brandColor');
      expect(b).toHaveProperty('portalTitle');
      expect(b).toHaveProperty('poweredBy', 'GlobePen');

      // Must not leak private schema fields
      expect(b).not.toHaveProperty('domainVerificationToken');
      expect(b).not.toHaveProperty('passwordHash');
      expect(b).not.toHaveProperty('users');
    });

    it('Does NOT allow client slug parameter to override the current portal hostname', async () => {
      // Visiting Alpha's portal but attempting ?slug=beta-college
      const res = await request(app)
        .get('/api/schools/branding?slug=beta-college')
        .set('Host', 'alpha-academy.localhost');

      expect(res.status).toBe(200);
      // Must STILL return Alpha Academy!
      expect(res.body.branding.schoolId).toBe(schoolAlpha.id);
      expect(res.body.branding.schoolName).toBe('Alpha Academy');
    });

    it('Allows school admin to update branding and validates hex color format', async () => {
      // Invalid hex code
      const invalidRes = await request(app)
        .put('/api/schools/branding')
        .set('Host', 'alpha-academy.localhost')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({ brandColor: 'not-a-color' });
      expect(invalidRes.status).toBe(400);

      // Valid branding update
      const validRes = await request(app)
        .put('/api/schools/branding')
        .set('Host', 'alpha-academy.localhost')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({
          brandColor: '#0F766E',
          secondaryColor: '#115E59',
          portalTitle: 'Alpha Academy Global Portal',
          contactEmail: 'contact@alpha.edu',
          contactPhone: '+1-555-ALPHA',
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.branding.brandColor).toBe('#0F766E');
      expect(validRes.body.branding.portalTitle).toBe('Alpha Academy Global Portal');

      // School Beta's branding remains untouched
      const betaRes = await request(app)
        .get('/api/schools/branding')
        .set('Host', 'beta-college.localhost');
      expect(betaRes.status).toBe(200);
      expect(betaRes.body.branding.schoolName).toBe('Beta College');
      expect(betaRes.body.branding.brandColor).toBe('#2563EB');
    });
  });

  describe('3. Strict Tenant Boundaries across Auth & Hostnames', () => {
    it('Wrong-School Login: Rejects user belonging to Alpha attempting to log in on Beta portal BEFORE issuing cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Host', 'beta-college.localhost')
        .send({
          email: userAlphaEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/does not belong to this school portal/i);
      // No auth cookie must be set
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('Superadmin cannot log in through an individual school portal login form', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Host', 'alpha-academy.localhost')
        .send({
          email: 'superadmin@uprecord.local',
          password: 'SuperAdmin#2026!Secure',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/central platform portal/i);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('Wrong-School Session Validation: Rejects Alpha session cookie presented on Beta portal', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Host', 'beta-college.localhost')
        .set('Cookie', adminAlphaCookies);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Hostname tenant mismatch/i);
    });

    it('Protected School Routes: Rejects Alpha session cookie accessing tenant routes on Beta portal', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Host', 'beta-college.localhost')
        .set('Cookie', adminAlphaCookies);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Hostname tenant mismatch/i);
    });

    it('Password Activation: Rejects activation token belonging to Alpha when attempted on Beta portal', async () => {
      // 1. Invite a teacher on Alpha
      const inviteRes = await request(app)
        .post('/api/auth/invite')
        .set('Host', 'alpha-academy.localhost')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({
          email: 'teacher@alpha-academy.edu',
          fullName: 'Alpha Teacher',
          role: 'teacher',
        });
      expect(inviteRes.status).toBe(201);

      // Extract raw setupToken from invite response
      const token = inviteRes.body.setupToken;
      expect(token).toBeDefined();

      // Database persists only the SHA-256 hash, not the plaintext token
      const invitedUser = await prisma.user.findUnique({
        where: { email: 'teacher@alpha-academy.edu' },
      });
      expect(invitedUser?.setupToken).toBeNull();
      expect(invitedUser?.setupTokenHash).toBeDefined();

      // 2. Attempt activation on Beta portal
      const activateOnBeta = await request(app)
        .post('/api/auth/setup-password')
        .set('Host', 'beta-college.localhost')
        .send({
          token,
          password: 'TeacherPassword123!',
        });

      expect(activateOnBeta.status).toBe(403);
      expect(activateOnBeta.body.error).toMatch(/different school portal/i);

      // 3. Activation succeeds on Alpha portal
      const activateOnAlpha = await request(app)
        .post('/api/auth/setup-password')
        .set('Host', 'alpha-academy.localhost')
        .send({
          token,
          password: 'TeacherPassword123!',
        });

      expect(activateOnAlpha.status).toBe(200);
      expect(activateOnAlpha.body.message).toMatch(/Password created successfully/i);
    });

    it('Client-supplied schoolId parameter tampering is stripped and cannot cross boundaries', async () => {
      const cls = await prisma.class.create({
        data: { schoolId: schoolAlpha.id, className: 'Alpha Class 1', level: 'Primary' },
      });
      // Alpha admin creates student but passes schoolId: schoolBeta.id
      const res = await request(app)
        .post('/api/students')
        .set('Host', 'alpha-academy.localhost')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({
          admissionNumber: 'TAMPER-001',
          fullName: 'Tampered Student',
          gender: 'Male',
          classId: cls.id,
          schoolId: schoolBeta.id, // Attempt to inject Beta's schoolId
        });

      expect(res.status).toBe(201);
      // Student must belong to Alpha, NOT Beta!
      expect(res.body.student.schoolId).toBe(schoolAlpha.id);

      const inBeta = await prisma.student.findFirst({
        where: { admissionNumber: 'TAMPER-001', schoolId: schoolBeta.id },
      });
      expect(inBeta).toBeNull();
    });
  });

  describe('4. Custom Domain Configuration & Ownership Verification', () => {
    const customDomain = 'portal.alpha-academy.org';

    it('Registers custom domain, generates fresh DNS TXT challenge, and resets verification state', async () => {
      const res = await request(app)
        .post('/api/schools/custom-domain')
        .set('Host', 'alpha-academy.localhost')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({ domain: customDomain });

      expect(res.status).toBe(200);
      expect(res.body.domain).toBe(customDomain);
      expect(res.body.verificationStatus).toBe('ownership_unverified');
      expect(res.body.dnsChallenge.recordType).toBe('TXT');
      expect(res.body.dnsChallenge.recordHost).toBe(`_globepen-challenge.${customDomain}`);
      expect(res.body.dnsChallenge.recordValue).toMatch(/^globepen-verify-/);

      // Unverified custom domain MUST NOT be recognized yet
      const unverifiedLookup = await request(app)
        .get('/api/schools/branding')
        .set('Host', customDomain);

      expect(unverifiedLookup.status).toBe(404);
      expect(unverifiedLookup.body.error).toMatch(/Unrecognized host or unverified domain/i);
    });

    it('Fails verification when DNS TXT token does not match', async () => {
      vi.spyOn(dns.promises, 'resolveTxt').mockResolvedValue([['wrong-token']]);
      const failRes = await request(app)
        .post('/api/schools/custom-domain/verify')
        .set('Host', 'alpha-academy.localhost')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({});

      expect(failRes.status).toBe(400);
      expect(failRes.body.error).toMatch(/verification failed/i);
    });

    it('Verifies domain ownership and activates custom domain for hostname resolution', async () => {
      const schoolRecord = await prisma.school.findUnique({
        where: { id: schoolAlpha.id },
      });
      const validToken = schoolRecord?.domainVerificationToken;
      const lookup = vi.spyOn(dns.promises, 'resolveTxt').mockResolvedValue([[validToken!]]);

      const verifyRes = await request(app)
        .post('/api/schools/custom-domain/verify')
        .set('Host', 'alpha-academy.localhost')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({});

      expect(verifyRes.status).toBe(200);
      expect(lookup).toHaveBeenCalledWith(`_globepen-challenge.${customDomain}`);
      expect(verifyRes.body.verificationStatus).toBe('ownership_verified');
      expect(verifyRes.body.deploymentNote).toBeDefined();

      // Now request with Host: portal.alpha-academy.org resolves Alpha Academy!
      const activeRes = await request(app)
        .get('/api/schools/branding')
        .set('Host', customDomain);

      expect(activeRes.status).toBe(200);
      expect(activeRes.body.branding.schoolId).toBe(schoolAlpha.id);
      expect(activeRes.body.branding.schoolName).toBe('Alpha Academy');
      expect(activeRes.body.branding.customDomain).toBe(customDomain);
    });

    it('serves the exact same branding on school subdomain and verified custom domain', async () => {
      const subdomainRes = await request(app)
        .get('/api/schools/branding')
        .set('Host', 'alpha-academy.localhost');

      const customDomainRes = await request(app)
        .get('/api/schools/branding')
        .set('Host', customDomain);

      expect(subdomainRes.status).toBe(200);
      expect(customDomainRes.status).toBe(200);
      expect(customDomainRes.body.branding).toMatchObject({
        schoolId: subdomainRes.body.branding.schoolId,
        schoolName: subdomainRes.body.branding.schoolName,
        brandColor: subdomainRes.body.branding.brandColor,
        secondaryColor: subdomainRes.body.branding.secondaryColor,
        portalTitle: subdomainRes.body.branding.portalTitle,
        logoUrl: subdomainRes.body.branding.logoUrl,
      });
    });

    it('Changing custom domain immediately resets verification to unverified', async () => {
      const newDomain = 'app.alpha-academy.org';
      const changeRes = await request(app)
        .post('/api/schools/custom-domain')
        .set('Host', 'alpha-academy.localhost')
        .set('Authorization', `Bearer ${adminAlphaToken}`)
        .send({ domain: newDomain });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.verificationStatus).toBe('ownership_unverified');

      const schoolRecord = await prisma.school.findUnique({
        where: { id: schoolAlpha.id },
      });
      expect(schoolRecord?.customDomainVerified).toBe(false);

      // New domain is unverified, so Host lookup returns 404
      const lookup = await request(app)
        .get('/api/schools/branding')
        .set('Host', newDomain);
      expect(lookup.status).toBe(404);
    });

    it('Deleting custom domain clears domain and verification status', async () => {
      const delRes = await request(app)
        .delete('/api/schools/custom-domain')
        .set('Host', 'alpha-academy.localhost')
        .set('Authorization', `Bearer ${adminAlphaToken}`);

      expect(delRes.status).toBe(200);

      const fresh = await prisma.school.findUnique({ where: { id: schoolAlpha.id } });
      expect(fresh?.customDomain).toBeNull();
      expect(fresh?.customDomainVerified).toBe(false);
      expect(fresh?.domainVerificationToken).toBeNull();
    });
  });
});
