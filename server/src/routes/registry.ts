import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();
router.use(authenticate, enforceTenant, requireAdmin);
const schemas = {
  classes: z.object({ className: z.string().trim().min(1).max(100), level: z.string().trim().min(1).max(100) }).strict(),
  students: z.object({ fullName: z.string().trim().min(2).max(150), admissionNumber: z.string().trim().min(1).max(100), gender: z.enum(['Male', 'Female']), classId: z.number().int().positive() }).strict(),
  teachers: z.object({ fullName: z.string().trim().min(2).max(150), email: z.string().email().max(254), phone: z.string().max(40).optional() }).strict(),
};
const teacherFields = { id: true, schoolId: true, fullName: true, email: true, phone: true, status: true };
router.get('/history', async (req, res, next) => {
  try {
    const schoolId = req.user!.schoolId!;
    const kind = typeof req.query.kind === 'string' ? req.query.kind : 'grades';
    const collections = { grades: prisma.grade, traitGrades: prisma.traitGrade, attendance: prisma.attendance, dailyAttendance: prisma.dailyAttendance };
    if (!Object.hasOwn(collections, kind)) return res.status(400).json({ error: 'Invalid history collection.' });
    const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : '';
    const where = { schoolId, student: { schoolId, ...(search ? { OR: [{fullName:{contains:search}},{admissionNumber:{contains:search}}] } : {}) } };
    const include = { student: { select: { fullName: true, admissionNumber: true } }, ...(kind === 'grades' ? { subject: { select: { subjectName: true } } } : kind === 'traitGrades' ? { trait: { select: { traitName: true } } } : {}) };
    const model: any = collections[kind as keyof typeof collections];
    const [records, total, counts] = await Promise.all([
      model.findMany({where,include,orderBy:{id:'asc'},skip:(page-1)*50,take:50}),
      model.count({where}),
      Promise.all(Object.values(collections).map((m: any) => m.count({where:{schoolId}}))),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ schoolId, records, total, page, counts: Object.fromEntries(Object.keys(collections).map((key,i)=>[key,counts[i]])) });
  } catch (e) { next(e); }
});
router.get('/', async (req, res, next) => {
  try {
    const schoolId = req.user!.schoolId!;
    const [classes, students, teachers] = await Promise.all([
      prisma.class.findMany({ where: { schoolId }, orderBy: { className: 'asc' } }),
      prisma.student.findMany({ where: { schoolId }, orderBy: { fullName: 'asc' } }),
      prisma.user.findMany({ where: { schoolId, role: 'teacher' }, select: teacherFields, orderBy: { fullName: 'asc' } }),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ schoolId, classes, students, teachers });
  } catch (e) { next(e); }
});

async function mutate(req: any, res: any, next: any) {
  try {
    const kind = req.params.kind as keyof typeof schemas;
    if (!Object.hasOwn(schemas, kind)) return res.status(404).json({ error: 'Unknown registry collection.' });
    const id = req.params.id ? Number(req.params.id) : undefined;
    if (req.params.id && (!Number.isSafeInteger(id) || id! <= 0)) return res.status(400).json({ error: 'Invalid record ID.' });
    const schoolId = req.user.schoolId;
    const model: any = kind === 'classes' ? prisma.class : kind === 'students' ? prisma.student : prisma.user;
    const where = { schoolId, ...(kind === 'teachers' ? { role: 'teacher' } : {}), ...(id ? { id } : {}) };
    if (id && !await model.findFirst({ where, select: { id: true } })) return res.status(404).json({ error: 'Record not found in your school.' });
    if (req.method === 'DELETE') {
      if (kind === 'classes' && await prisma.student.count({ where: { schoolId, classId: id } })) return res.status(409).json({ error: 'Move students out of this class before deleting it.' });
      await model.deleteMany({ where });
      return res.status(204).end();
    }
    const parsed = schemas[kind].safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please check the required fields. Unexpected fields are not accepted.' });
    const data: any = parsed.data;
    if (kind === 'students' && !await prisma.class.findFirst({ where: { id: data.classId, schoolId }, select: { id: true } })) return res.status(400).json({ error: 'Choose a class belonging to your school.' });
    if (id) {
      await model.updateMany({ where, data });
      return res.json({ saved: true });
    }
    // Teacher records have no login credentials until an explicit activation flow.
    await model.create({ data: { ...data, schoolId, ...(kind === 'teachers' ? { role: 'teacher', status: 'pending_activation', isAdmin: false, isSuperAdmin: false } : {}) } });
    return res.status(201).json({ saved: true });
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'A record with these details already exists.' });
    next(e);
  }
}
router.post('/:kind', mutate);
router.put('/:kind/:id', mutate);
router.delete('/:kind/:id', mutate);
export default router;
