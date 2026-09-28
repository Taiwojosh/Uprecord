import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/index.js';
import prisma from '../src/lib/prisma.js';
describe('Persistent pilot registry', () => {
  let a: any, b: any, token: string, otherToken: string, classId: number;
  beforeAll(async () => {
    a = await prisma.school.create({data:{name:'Pilot A',slug:'pilot-a'}});
    b = await prisma.school.create({data:{name:'Pilot B',slug:'pilot-b'}});
    for (const [school,email] of [[a,'a@pilot.test'],[b,'b@pilot.test']] as const) {
      await prisma.user.create({data:{schoolId:school.id,email,fullName:'Pilot Admin',role:'admin',passwordHash:await bcrypt.hash('PilotPassword#123',10)}});
    }
    token=(await request(app).post('/api/auth/login').set('Host','localhost').send({email:'a@pilot.test',password:'PilotPassword#123'})).body.token;
    otherToken=(await request(app).post('/api/auth/login').set('Host','localhost').send({email:'b@pilot.test',password:'PilotPassword#123'})).body.token;
  });
  const api = (method: 'get'|'post'|'put'|'delete', path:string, auth?:string, host='localhost') => request(app)[method](path).set('Host',host).set('Authorization',`Bearer ${auth || token}`);
  it('persists class, student and teacher records and exposes no authentication secrets', async () => {
    expect((await api('post','/api/registry/classes').send({className:'Pilot Class',level:'Primary'})).status).toBe(201);
    classId=(await api('get','/api/registry')).body.classes[0].id;
    expect((await api('post','/api/registry/students').send({fullName:'Sample Student',admissionNumber:'TEST-1',gender:'Female',classId})).status).toBe(201);
    expect((await api('post','/api/registry/teachers').send({fullName:'Sample Teacher',email:'teacher@pilot.test'})).status).toBe(201);
    const freshToken=(await request(app).post('/api/auth/login').set('Host','localhost').send({email:'a@pilot.test',password:'PilotPassword#123'})).body.token;
    const records=await api('get','/api/registry',freshToken);
    expect(records.body.students).toHaveLength(1);
    expect(records.body.teachers).toHaveLength(1);
    expect(records.body.teachers[0]).not.toHaveProperty('passwordHash');
    expect(records.body.teachers[0].status).toBe('pending_activation');
    expect(await prisma.student.count({where:{schoolId:a.id}})).toBe(1);
  });
  it('rejects host mismatches, foreign records, role escalation and foreign class references', async () => {
    expect((await api('get','/api/registry',token,'pilot-b.localhost')).status).toBe(403);
    expect((await api('get','/api/registry',otherToken)).body.students).toHaveLength(0);
    expect((await api('put',`/api/registry/classes/${classId}`,otherToken).send({className:'Stolen',level:'Primary'})).status).toBe(404);
    expect((await api('delete',`/api/registry/classes/${classId}`,otherToken)).status).toBe(404);
    expect((await api('post','/api/registry/students',otherToken).send({fullName:'Foreign Student',admissionNumber:'BAD',gender:'Male',classId})).status).toBe(400);
    expect((await api('post','/api/registry/teachers').send({fullName:'Escalated Teacher',email:'bad@pilot.test',role:'superadmin'})).status).toBe(400);
    expect((await api('post','/api/registry/classes').send({className:'Scoped',level:'Primary',schoolId:b.id})).status).toBe(201);
    expect(await prisma.class.count({where:{schoolId:b.id}})).toBe(0);
  });
  it('updates records and prevents deleting an occupied class', async () => {
    expect((await api('put',`/api/registry/classes/${classId}`).send({className:'Updated Pilot Class',level:'Primary'})).status).toBe(200);
    expect((await api('delete',`/api/registry/classes/${classId}`)).status).toBe(409);
    const records=(await api('get','/api/registry')).body;
    expect((await api('delete',`/api/registry/students/${records.students[0].id}`)).status).toBe(204);
    expect((await api('delete',`/api/registry/classes/${classId}`)).status).toBe(204);
  });
  it('serves the same saved school branding on its subdomain and verified custom domain', async () => {
    const logoUrl = 'https://example.test/school-logo.png';
    expect((await api('put','/api/schools/branding').send({ brandColor: '#FFD700', secondaryColor: '#111827', logoUrl, portalTitle: 'Pilot School Portal' })).status).toBe(200);
    await prisma.school.update({where:{id:a.id},data:{customDomain:'school.pilot.test',customDomainVerified:true}});
    for (const host of ['pilot-a.localhost','school.pilot.test']) {
      const response=await request(app).get('/api/schools/branding').set('Host',host);
      expect(response.status).toBe(200);
      expect(response.body.branding).toMatchObject({schoolId:a.id,brandColor:'#FFD700',secondaryColor:'#111827',logoUrl,portalTitle:'Pilot School Portal'});
    }
    const denied=await api('put','/api/schools/branding',otherToken,'school.pilot.test').send({brandColor:'#ff0000'});
    expect(denied.status).toBe(403);
    expect((await request(app).get('/api/schools/branding').set('Host','unverified.pilot.test')).status).toBe(404);
  });
  it('invites only a pupil from the same school and stores no raw activation token', async () => {
    const ownClass = await prisma.class.create({ data: { schoolId: a.id, className: 'Invite Class', level: 'Primary' } });
    const own = await prisma.student.create({ data: { schoolId: a.id, classId: ownClass.id, fullName: 'Own Pupil', admissionNumber: 'OWN-INVITE', gender: 'Female' } });
    const otherClass = await prisma.class.create({ data: { schoolId: b.id, className: 'Other Class', level: 'Primary' } });
    const foreign = await prisma.student.create({ data: { schoolId: b.id, classId: otherClass.id, fullName: 'Other Pupil', admissionNumber: 'OTHER-1', gender: 'Male' } });
    const invite = (email: string, role: string, studentId?: number) => api('post', '/api/auth/invite').send({ email, fullName: 'Pilot Pupil', role, studentId });
    expect((await invite('foreign@pilot.test', 'student', foreign.id)).status).toBe(400);
    expect((await invite('staff-linked@pilot.test', 'teacher', own.id)).status).toBe(400);
    const result = await invite('own-pupil@pilot.test', 'student', own.id);
    expect(result.status).toBe(201);
    expect(result.body.setupToken).toMatch(/^[0-9a-f]{64}$/);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'own-pupil@pilot.test' } });
    expect(user.setupToken).toBeNull();
    expect(user.setupTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect((await invite('duplicate-pupil@pilot.test', 'student', own.id)).status).toBe(409);
  });
  it('returns a manual activation link when email delivery is disabled', async () => {
    const previous = process.env.EMAIL_DELIVERY_MODE;
    process.env.EMAIL_DELIVERY_MODE = 'disabled';
    try {
      const result = await api('post', '/api/auth/invite').send({ email: 'manual@pilot.test', fullName: 'Manual Teacher', role: 'teacher' });
      expect(result.status).toBe(201);
      expect(result.body.setupUrl).toContain('/setup-password?token=');
      const user = await prisma.user.findUniqueOrThrow({ where: { email: 'manual@pilot.test' } });
      expect(user.setupToken).toBeNull();
      expect(user.setupTokenHash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      if (previous === undefined) delete process.env.EMAIL_DELIVERY_MODE;
      else process.env.EMAIL_DELIVERY_MODE = previous;
    }
  });
});
