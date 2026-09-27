import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';

const router = Router();
router.use(authenticate, enforceTenant);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const question = z.object({ prompt: z.string().trim().min(1).max(2000), options: z.array(z.string().trim().min(1).max(500)).length(4), correct: z.number().int().min(0).max(3) });
const assessmentInput = z.object({ title: z.string().trim().min(1).max(160), classId: z.number().int().positive(), durationMinutes: z.number().int().min(1).max(180), questions: z.array(question).min(1).max(100) });
type Question = z.infer<typeof question>;
const wrap = (fn: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };
const staff = (req: Request) => !req.user!.isSuperAdmin && (req.user!.isAdmin || ['admin', 'teacher'].includes(req.user!.role));
const admin = (req: Request) => req.user!.isAdmin || req.user!.role === 'admin';
async function classes(req: Request) {
  return prisma.class.findMany({ where: { schoolId: req.user!.schoolId!, ...(admin(req) ? {} : { teacherId: req.user!.userId }) }, select: { id: true, className: true } });
}
async function student(req: Request) {
  if (req.user!.role !== 'student' || !req.user!.studentId) return null;
  return prisma.student.findFirst({ where: { id: req.user!.studentId, schoolId: req.user!.schoolId!, status: 'Active' } });
}
async function owned(req: Request) {
  if (!staff(req)) return null;
  const item = await prisma.cbtAssessment.findFirst({ where: { id: req.params.id, schoolId: req.user!.schoolId!, ...(admin(req) ? {} : { teacherId: req.user!.userId }) } });
  if (!item || !(await classes(req)).some(c => c.id === item.classId)) return null;
  return item;
}
export function scoreCbt(questions: Question[], answers: Record<string, number>) {
  return questions.reduce((total, q, i) => total + (answers[String(i)] === q.correct ? 1 : 0), 0);
}
const publicQuestions = (raw: string) => (JSON.parse(raw) as Question[]).map(({ prompt, options }) => ({ prompt, options }));

router.get('/', wrap(async (req, res) => {
  const pupil = await student(req);
  if (!staff(req) && !pupil) { res.status(403).json({ error: 'An active student or teaching account is required.' }); return; }
  const allowed = staff(req) ? await classes(req) : [];
  const items = await prisma.cbtAssessment.findMany({ where: { schoolId: req.user!.schoolId!, ...(pupil ? { classId: pupil.classId, published: true } : { classId: { in: allowed.map(c => c.id) }, ...(admin(req) ? {} : { teacherId: req.user!.userId }) }) }, orderBy: { createdAt: 'desc' } });
  res.json({ staff: staff(req), classes: allowed, assessments: items.map(({ questions, ...item }) => ({ ...item, questionCount: JSON.parse(questions).length })) });
}));

router.post('/', wrap(async (req, res) => {
  const parsed = assessmentInput.safeParse(req.body);
  if (!staff(req)) { res.status(403).json({ error: 'Teaching access required.' }); return; }
  if (!parsed.success) { res.status(400).json({ error: 'Enter a title, assigned class, duration and 1–100 complete four-option questions.' }); return; }
  if (!(await classes(req)).some(c => c.id === parsed.data.classId)) { res.status(403).json({ error: 'Choose a class assigned to you.' }); return; }
  const { questions, ...data } = parsed.data;
  res.status(201).json(await prisma.cbtAssessment.create({ data: { ...data, questions: JSON.stringify(questions), schoolId: req.user!.schoolId!, teacherId: req.user!.userId } }));
}));
router.get('/:id/edit', wrap(async (req, res) => {
  const item = await owned(req);
  if (!item) { res.status(404).json({ error: 'Assessment not found.' }); return; }
  res.json({ ...item, questions: JSON.parse(item.questions) });
}));
router.put('/:id', wrap(async (req, res) => {
  const item = await owned(req); const parsed = assessmentInput.safeParse(req.body);
  if (!item) { res.status(404).json({ error: 'Assessment not found.' }); return; }
  if (!parsed.success) { res.status(400).json({ error: 'Complete all question fields.' }); return; }
  if (!(await classes(req)).some(c => c.id === parsed.data.classId)) { res.status(403).json({ error: 'Choose an assigned class.' }); return; }
  const { questions, ...data } = parsed.data;
  const result = await prisma.cbtAssessment.updateMany({ where: { id: item.id, schoolId: item.schoolId, published: false }, data: { ...data, questions: JSON.stringify(questions) } });
  if (!result.count) { res.status(409).json({ error: 'Published assessments cannot be changed.' }); return; }
  res.json({ ok: true });
}));
router.post('/:id/publish', wrap(async (req, res) => {
  const item = await owned(req);
  if (!item) { res.status(404).json({ error: 'Assessment not found.' }); return; }
  await prisma.cbtAssessment.updateMany({ where: { id: item.id, schoolId: item.schoolId }, data: { published: true } });
  res.json({ ok: true });
}));
router.get('/:id/results', wrap(async (req, res) => {
  const item = await owned(req);
  if (!item) { res.status(404).json({ error: 'Assessment not found.' }); return; }
  const attempts = await prisma.cbtAttempt.findMany({ where: { assessmentId: item.id, schoolId: item.schoolId } });
  const questions = JSON.parse(item.questions) as Question[];
  for (const attempt of attempts) if (!attempt.submittedAt && attempt.expiresAt.getTime() <= Date.now()) {
    await prisma.cbtAttempt.updateMany({ where: { id: attempt.id, submittedAt: null }, data: { submittedAt: attempt.expiresAt, score: scoreCbt(questions, JSON.parse(attempt.answers)) } });
  }
  const results = await prisma.cbtAttempt.findMany({ where: { assessmentId: item.id, schoolId: item.schoolId }, select: { id: true, studentId: true, startedAt: true, submittedAt: true, score: true } });
  const pupils = await prisma.student.findMany({ where: { schoolId: item.schoolId, id: { in: results.map(r => r.studentId) } }, select: { id: true, fullName: true } });
  res.json({ total: questions.length, results: results.map(r => ({ ...r, studentName: pupils.find(p => p.id === r.studentId)?.fullName || 'Former student' })) });
}));

// One attempt per pupil, across account changes. The server owns the deadline and answer key.
router.post('/:id/attempt', wrap(async (req, res) => {
  const pupil = await student(req);
  const item = pupil && await prisma.cbtAssessment.findFirst({ where: { id: req.params.id, schoolId: req.user!.schoolId!, classId: pupil.classId, published: true } });
  if (!item || !pupil) { res.status(404).json({ error: 'Assessment unavailable for your class.' }); return; }
  const attempt = await prisma.cbtAttempt.upsert({ where: { assessmentId_studentId: { assessmentId: item.id, studentId: pupil.id } }, create: { assessmentId: item.id, studentId: pupil.id, schoolId: item.schoolId, expiresAt: new Date(Date.now() + item.durationMinutes * 60000) }, update: {} });
  if (!attempt.submittedAt && attempt.expiresAt.getTime() <= Date.now()) {
    await prisma.cbtAttempt.updateMany({ where: { id: attempt.id, submittedAt: null }, data: { submittedAt: attempt.expiresAt, score: scoreCbt(JSON.parse(item.questions), JSON.parse(attempt.answers)) } });
  }
  const current = await prisma.cbtAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  res.json({ ...current, answers: JSON.parse(current.answers), title: item.title, questions: publicQuestions(item.questions), serverNow: new Date().toISOString() });
}));
router.put('/:id/attempt', wrap(async (req, res) => {
  const pupil = await student(req);
  const item = pupil && await prisma.cbtAssessment.findFirst({ where: { id: req.params.id, schoolId: req.user!.schoolId!, classId: pupil.classId, published: true } });
  if (!item || !pupil) { res.status(404).json({ error: 'Assessment unavailable.' }); return; }
  const parsed = z.object({ answers: z.record(z.string().regex(/^(0|[1-9]\d{0,2})$/), z.number().int().min(0).max(3)), submit: z.boolean().default(false) }).safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data.answers).some(k => Number(k) >= JSON.parse(item.questions).length)) { res.status(400).json({ error: 'Invalid answers.' }); return; }
  const current = await prisma.cbtAttempt.findUnique({ where: { assessmentId_studentId: { assessmentId: item.id, studentId: pupil.id } } });
  if (!current) { res.status(409).json({ error: 'Start the assessment first.' }); return; }
  const now = new Date(); const expired = current.expiresAt <= now;
  // An expired request can only score answers already saved before its deadline.
  const answers = expired ? JSON.parse(current.answers) : parsed.data.answers;
  await prisma.cbtAttempt.updateMany({ where: { id: current.id, schoolId: item.schoolId, submittedAt: null, ...(expired ? {} : { expiresAt: { gt: now } }) }, data: { answers: JSON.stringify(answers), ...((expired || parsed.data.submit) ? { submittedAt: expired ? current.expiresAt : now, score: scoreCbt(JSON.parse(item.questions), answers) } : {}) } });
  const result = await prisma.cbtAttempt.findUniqueOrThrow({ where: { id: current.id } });
  res.json({ ...result, answers: JSON.parse(result.answers), serverNow: new Date().toISOString() });
}));

export default router;
