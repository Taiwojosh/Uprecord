import { beforeAll, afterEach, expect, it, vi } from 'vitest';
import request from 'supertest';
import dns from 'node:dns';
import app from '../src/index.js';
import prisma from '../src/lib/prisma.js';
import { seedSuperadmin } from '../src/scripts/seedSuperadmin.js';
import { generateSlug, backfillSchoolSlugs } from '../src/scripts/backfillSlugs.js';

let token: string;
let schoolId: string;
const schoolHost = 'review-school.localhost';
beforeAll(async () => {
  const r = await request(app).post('/api/auth/register').set('Host', 'localhost').send({
    schoolName: 'Review School', email: 'review@example.test', password: 'ReviewPassword123!', fullName: 'Reviewer',
  });
  expect(r.status).toBe(201);
  token = r.body.token;
  schoolId = r.body.school.id;
  await seedSuperadmin('review-super@example.test', 'ReviewPassword123!');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });
function post(path: string) {
  return request(app).post(path).set('Host', schoolHost).set('Authorization', `Bearer ${token}`);
}
async function register(domain: string) {
  const r = await post('/api/schools/custom-domain').send({ domain });
  expect(r.status).toBe(200);
  return r.body.dnsChallenge.recordValue;
}

it('must not accept a request token as proof of DNS ownership in production', async () => {
  const challenge = await register('portal.unowned.example');
  const lookup = vi.spyOn(dns.promises, 'resolveTxt').mockRejectedValue(new Error('No DNS record'));
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('PLATFORM_HOSTS', 'review-platform.example');
  const r = await request(app).post('/api/schools/custom-domain/verify')
    .set('Host', 'review-platform.example').set('Authorization', `Bearer ${token}`)
    .send({ mockVerificationToken: challenge });
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  console.log('PROOF DNS bypass', JSON.stringify({ status: r.status, dnsCalls: lookup.mock.calls.length, verified: school?.customDomainVerified }));
  expect(r.status).toBe(400);
  expect(lookup).toHaveBeenCalledOnce();
  expect(school?.customDomainVerified).toBe(false);
});

it('must handle the bodyless verify request made by the UI', async () => {
  const challenge = await register('portal.bodyless.example');
  vi.spyOn(dns.promises, 'resolveTxt').mockResolvedValue([[challenge]]);
  const r = await post('/api/schools/custom-domain/verify');
  console.log('PROOF bodyless verification', r.status, r.body);
  expect(r.status).toBe(200);
});

it('must not verify a replacement domain using an in-flight old-domain DNS response', async () => {
  const oldToken = await register('portal.old-domain.example');
  let release!: (records: string[][]) => void;
  let began!: () => void;
  const started = new Promise<void>((resolve) => { began = resolve; });
  vi.spyOn(dns.promises, 'resolveTxt').mockImplementation(() => {
    began();
    return new Promise<string[][]>((resolve) => { release = resolve; });
  });
  const pending = post('/api/schools/custom-domain/verify').send({}).then(r => r);
  await started;
  await register('portal.replacement.example');
  release([[oldToken]]);
  const r = await pending;
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  console.log('PROOF verification race', JSON.stringify({ status: r.status, domain: school?.customDomain, verified: school?.customDomainVerified }));
  expect(school?.customDomainVerified).toBe(false);
  expect(r.status).toBe(409);
});

it('must reject the dedicated superadmin login on a school hostname', async () => {
  const r = await request(app).post('/api/admin/login').set('Host', schoolHost)
    .send({ email: 'review-super@example.test', password: 'ReviewPassword123!' });
  console.log('PROOF admin host restriction', JSON.stringify({ status: r.status, cookieIssued: Boolean(r.headers['set-cookie']) }));
  expect(r.status).toBe(403);
  expect(r.headers['set-cookie']).toBeUndefined();
});

it('must reject another school hostname when reading activation token details', async () => {
  const invite = await post('/api/auth/invite').send({ email: 'review-teacher@example.test', fullName: 'Review Teacher', role: 'teacher' });
  expect(invite.status).toBe(201);
  const teacher = await prisma.user.findUnique({ where: { email: 'review-teacher@example.test' } });
  await prisma.school.create({ data: { name: 'Other Review School', slug: 'other-review-school' } });
  const r = await request(app).get('/api/auth/verify-setup-token').query({ token: teacher!.setupToken })
    .set('Host', 'other-review-school.localhost');
  console.log('PROOF activation lookup host restriction', JSON.stringify({ status: r.status, schoolName: r.body.schoolName }));
  expect(r.status).toBe(403);
});

it('keeps domain challenges private and restores pending and verified settings on reload', async () => {
  const challenge = await register('portal.reload.example');
  const getSettings = () => request(app).get('/api/schools/management').set('Host', 'localhost').set('Authorization', `Bearer ${token}`);
  let r = await getSettings();
  expect(r.status).toBe(200);
  expect(r.body.domain).toBe('portal.reload.example');
  expect(r.body.dnsChallenge.recordValue).toBe(challenge);
  expect(r.body.verificationStatus).toBe('ownership_unverified');
  expect(r.headers['cache-control']).toBe('no-store');
  const publicResponse = await request(app).get('/api/schools/branding').set('Host', schoolHost);
  expect(JSON.stringify(publicResponse.body)).not.toContain(challenge);
  expect(publicResponse.body.branding.customDomain).toBeNull();
  expect((await request(app).get('/api/schools/management').set('Host', schoolHost)).status).toBe(401);
  vi.spyOn(dns.promises, 'resolveTxt').mockResolvedValue([[challenge.slice(0, 20), challenge.slice(20)]]);
  expect((await post('/api/schools/custom-domain/verify')).status).toBe(200);
  r = await getSettings();
  expect(r.body.verificationStatus).toBe('ownership_verified');
  expect(r.body.verifiedAt).toBeTruthy();
  expect((await request(app).delete('/api/schools/custom-domain').set('Host', schoolHost).set('Authorization', `Bearer ${token}`)).status).toBe(200);
  r = await getSettings();
  expect(r.body.domain).toBeNull();
  expect(r.body.dnsChallenge).toBeNull();
});

it.each(['remove', 'rotate'])('rejects a stale DNS response after challenge %s', async (action) => {
  const challenge = await register('portal.concurrent.example');
  let release!: (r: string[][]) => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  vi.spyOn(dns.promises, 'resolveTxt').mockImplementation(() => {
    started(); return new Promise<string[][]>(resolve => { release = resolve; });
  });
  const pending = post('/api/schools/custom-domain/verify').send({}).then(r => r);
  await began;
  if (action === 'rotate') await register('portal.concurrent.example');
  else await request(app).delete('/api/schools/custom-domain').set('Host', schoolHost).set('Authorization', `Bearer ${token}`);
  release([[challenge]]);
  expect((await pending).status).toBe(409);
  expect((await prisma.school.findUnique({ where: { id: schoolId } }))?.customDomainVerified).toBe(false);
});

it('fails closed on DNS errors and timeouts', async () => {
  await register('portal.dns-failure.example');
  const lookup = vi.spyOn(dns.promises, 'resolveTxt').mockRejectedValue(new Error('ENOTFOUND'));
  expect((await post('/api/schools/custom-domain/verify')).status).toBe(400);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  lookup.mockImplementation(() => { started(); return new Promise(() => {}); });
  const pending = post('/api/schools/custom-domain/verify').then(r => r);
  await began;
  await vi.advanceTimersByTimeAsync(5001);
  expect((await pending).status).toBe(400);
  expect((await prisma.school.findUnique({ where: { id: schoolId } }))?.customDomainVerified).toBe(false);
});

it('persists validated branding server-side and prevents cross-school reads and edits', async () => {
  const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8S8AAAAASUVORK5CYII=';
  const r = await request(app).put('/api/schools/branding').set('Host', schoolHost).set('Authorization', `Bearer ${token}`)
    .send({ name: 'Review School Updated', slogan: 'A new motto', address: 'Campus Road', brandColor: '#123456', logoUrl: logo, contactEmail: null });
  expect(r.status).toBe(200);
  const fresh = await request(app).get('/api/schools/identity').set('Host', 'localhost').set('Authorization', `Bearer ${token}`);
  expect(fresh.body.branding.schoolName).toBe('Review School Updated');
  expect(fresh.body.branding.logoUrl).toBe(logo);
  expect(fresh.body.address).toBe('Campus Road');
  expect((await prisma.schoolSettings.findUnique({ where: { schoolId } }))?.logoBase64).toBe(logo);
  expect((await request(app).get('/api/schools/management').set('Host', 'other-review-school.localhost').set('Authorization', `Bearer ${token}`)).status).toBe(403);
  expect((await request(app).put('/api/schools/branding').set('Host', 'other-review-school.localhost').set('Authorization', `Bearer ${token}`).send({ name: 'Hijacked' })).status).toBe(403);
});

it.each(['javascript:alert(1)', 'http://unsafe.example/logo.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'https://user:password@example.com/logo.png'])('rejects unsafe logo %s', async (logoUrl) => {
  expect((await request(app).put('/api/schools/branding').set('Host', schoolHost).set('Authorization', `Bearer ${token}`).send({ logoUrl })).status).toBe(400);
});

it('rejects non-admin management and school-host access to authenticated platform APIs', async () => {
  const login = await request(app).post('/api/admin/login').set('Host', 'localhost').send({ email: 'review-super@example.test', password: 'ReviewPassword123!' });
  expect(login.status).toBe(200);
  expect((await request(app).get('/api/admin/schools').set('Host', schoolHost).set('Authorization', `Bearer ${login.body.token}`)).status).toBe(403);
  expect((await request(app).get('/api/admin/schools').set('Host', 'localhost').set('Authorization', `Bearer ${login.body.token}`)).status).toBe(200);
  const teacher = await prisma.user.findUniqueOrThrow({ where: { email: 'review-teacher@example.test' } });
  await request(app).post('/api/auth/setup-password').set('Host', schoolHost).send({ token: teacher.setupToken, password: 'TeacherPassword123!' });
  const teacherLogin = await request(app).post('/api/auth/login').set('Host', schoolHost).send({ email: teacher.email, password: 'TeacherPassword123!' });
  expect(teacherLogin.status).toBe(200);
  expect((await request(app).get('/api/schools/management').set('Host', schoolHost).set('Authorization', `Bearer ${teacherLogin.body.token}`)).status).toBe(403);
});

it('backfills unique DNS-safe slugs without changing already assigned slugs', async () => {
  expect(generateSlug('App')).toBe('school-app');
  expect(generateSlug('A'.repeat(100))).toHaveLength(48);
  const first = await prisma.school.create({ data: { name: 'Same Name' } });
  const second = await prisma.school.create({ data: { name: 'Same Name' } });
  await backfillSchoolSlugs();
  const a = await prisma.school.findUniqueOrThrow({ where: { id: first.id } });
  const b = await prisma.school.findUniqueOrThrow({ where: { id: second.id } });
  expect(a.slug).not.toBe(b.slug);
  expect((await prisma.school.findUnique({ where: { id: schoolId } }))?.slug).toBe('review-school');
  expect((await backfillSchoolSlugs()).updated).toBe(0);
});
