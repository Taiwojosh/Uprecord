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
  students: z.object({
    fullName: z.string().trim().min(2).max(150),
    admissionNumber: z.string().trim().max(100).optional().or(z.literal('')),
    gender: z.enum(['Male', 'Female']),
    classId: z.number().int().positive(),
  }).strict(),
  teachers: z.object({ fullName: z.string().trim().min(2).max(150), email: z.string().email().max(254), phone: z.string().max(40).optional() }).strict(),
  subjects: z.object({ subjectName: z.string().trim().min(1).max(150), isCore: z.boolean().optional(), teacherId: z.number().int().positive().optional(), classId: z.number().int().positive().optional() }).strict(),
};
const teacherFields = { id: true, schoolId: true, fullName: true, email: true, phone: true, status: true };

// ─── School abbreviation & admission number helpers ───────────────────
// The abbreviation is derived deterministically from the school name so new
// student numbers look consistent (e.g. "Devickys College" -> "DC-0001").
// Existing student admission numbers are never rewritten (the helper is only
// used when a create request omits an admission number).
function schoolAbbreviation(name: string | null | undefined): string {
  const source = (name || '').trim();
  const words = source.split(/\s+/).filter(Boolean);
  const letters = words
    .map(w => w.replace(/[^A-Za-z0-9]/g, '').charAt(0))
    .filter(Boolean)
    .slice(0, 3)
    .join('')
    .toUpperCase();
  if (letters.length >= 2) return letters;
  const fallback = source.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();
  return fallback.length >= 2 ? fallback : 'SCH';
}

async function nextAdmissionNumber(schoolId: string, abbreviation: string): Promise<string> {
  const prefix = abbreviation.toUpperCase();
  const existing = await prisma.student.findMany({ where: { schoolId }, select: { admissionNumber: true } });
  let seq = 0;
  for (const student of existing) {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(student.admissionNumber);
    if (match) seq = Math.max(seq, Number(match[1]));
  }
  return `${prefix}-${String(seq + 1).padStart(4, '0')}`;
}

// ─── Nigerian academic calendar helpers (mirrors client sessionDetector) ─
function detectCurrentSession(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}
function detectCurrentTerm(): number {
  const month = new Date().getMonth() + 1;
  if (month >= 9 && month <= 12) return 1;
  if (month >= 1 && month <= 3) return 2;
  return 3;
}
function advanceTerm(term: number): number {
  return term >= 3 ? 1 : term + 1;
}
function advanceSession(session: string | null | undefined): string {
  const match = /^(\d{4})\/(\d{4})$/.exec((session || '').trim());
  if (!match) return detectCurrentSession();
  const start = Number(match[1]);
  return `${start + 1}/${start + 2}`;
}

class StaleRegistryPlan extends Error {}

const LEVEL_ORDER = ['Primary', 'junior', 'senior', 'Secondary'];
function numericSuffix(className: string): number | null {
  const match = /(\d+)\s*$/.exec((className || '').trim());
  return match ? Number(match[1]) : null;
}
// Returns the recommended next class row for a student, or null when the
// student should be marked as graduated. Uses exact level ladder ordering and
// the numeric suffix within a level so "JSS 1" -> "JSS 2" -> "SS 1". Ties are
// broken deterministically by class name.
function recommendNextClass(level: string, className: string, classes: any[]): any | null {
  const levelIndex = LEVEL_ORDER.indexOf(level);
  const suffix = numericSuffix(className);
  if (levelIndex >= 0 && suffix != null) {
    const sameLevelNext = classes
      .filter(c => c.level === level && numericSuffix(c.className) === suffix + 1)
      .sort((a, b) => a.className.localeCompare(b.className));
    if (sameLevelNext.length > 0) return sameLevelNext[0];
  }
  if (levelIndex >= 0) {
    for (let nextIdx = levelIndex + 1; nextIdx < LEVEL_ORDER.length; nextIdx += 1) {
      const candidates = classes
        .filter(c => c.level === LEVEL_ORDER[nextIdx])
        .sort((a, b) => a.className.localeCompare(b.className));
      if (candidates.length > 0) return candidates[0];
    }
  }
  return null;
}
router.get('/history', async (req, res, next) => {
  try {
    const schoolId = req.user!.schoolId!;
    const kind = typeof req.query.kind === 'string' ? req.query.kind : 'grades';
    const grouped = req.query.grouped === '1';
    const collections = { grades: prisma.grade, traitGrades: prisma.traitGrade, attendance: prisma.attendance, dailyAttendance: prisma.dailyAttendance };
    if (!Object.hasOwn(collections, kind)) return res.status(400).json({ error: 'Invalid history collection.' });
    const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
    const search = typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : '';
    const where = { schoolId, student: { schoolId, ...(search ? { OR: [{fullName:{contains:search}},{admissionNumber:{contains:search}}] } : {}) } };
    const include = { student: { select: { fullName: true, admissionNumber: true } }, ...(kind === 'grades' ? { subject: { select: { subjectName: true } } } : kind === 'traitGrades' ? { trait: { select: { traitName: true } } } : {}) };
    const model: any = collections[kind as keyof typeof collections];
    const counts = await Promise.all(Object.values(collections).map((m: any) => m.count({ where: { schoolId } })));
    if (grouped) {
      // Group every saved record by session, then term, newest first so the
      // history page can present "Session · Term 1/2/3" sections.
      const years = await model.findMany({ where, include, orderBy: { id: 'asc' }, take: 2000 });
      const sessions: string[] = [];
      const groups: Record<string, Record<number, any[]>> = {};
      for (const record of years) {
        const session = String(record.session || 'Unspecified session');
        const term = record.term ?? 0;
        if (!groups[session]) { groups[session] = {}; sessions.push(session); }
        (groups[session][term] ||= []).push(record);
      }
      sessions.sort().reverse();
      const groupList = sessions.map(session => ({
        session,
        terms: Object.keys(groups[session]).map(Number).sort((a, b) => b - a).map(term => ({
          term,
          count: groups[session][term].length,
          records: groups[session][term].slice(0, 100),
        })),
      }));
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ schoolId, grouped: true, total: years.length, groups: groupList, counts: Object.fromEntries(Object.keys(collections).map((key, i) => [key, counts[i]])) });
    }
    const [records, total] = await Promise.all([
      model.findMany({ where, include, orderBy: { id: 'asc' }, skip: (page - 1) * 50, take: 50 }),
      model.count({ where }),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ schoolId, records, total, page, counts: Object.fromEntries(Object.keys(collections).map((key, i) => [key, counts[i]])) });
  } catch (e) { next(e); }
});
router.get('/', async (req, res, next) => {
  try {
    const schoolId = req.user!.schoolId!;
    const [classes, students, teachers, subjects, settings, school] = await Promise.all([
      prisma.class.findMany({ where: { schoolId }, orderBy: { className: 'asc' } }),
      prisma.student.findMany({ where: { schoolId }, orderBy: { fullName: 'asc' } }),
      prisma.user.findMany({ where: { schoolId, role: 'teacher' }, select: teacherFields, orderBy: { fullName: 'asc' } }),
      prisma.subject.findMany({ where: { schoolId }, orderBy: { subjectName: 'asc' } }),
      prisma.schoolSettings.findUnique({ where: { schoolId } }),
      prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    ]);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      schoolId,
      classes,
      students,
      teachers,
      subjects,
      schoolInfo: { name: school?.name || '', abbreviation: schoolAbbreviation(school?.name) },
      termInfo: { currentTerm: settings?.currentTerm ?? detectCurrentTerm(), currentSession: settings?.currentSession || detectCurrentSession() },
    });
  } catch (e) { next(e); }
});

// ─── Term/Session rollover preview (preview-first) ───────────────────
// Computes what the next term/session roster will look like WITHOUT changing
// anything. The client must show this preview and only then call /apply.
router.post('/rollover/preview', async (req, res, next) => {
  try {
    const schema = z.object({
      targetTerm: z.number().int().min(1).max(3).optional(),
      targetSession: z.string().regex(/^\d{4}\/\d{4}$/, 'Session must look like 2025/2026').optional(),
    }).strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please provide a valid rollover target term and/or session.' });
    const schoolId = req.user!.schoolId!;
    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });
    const fromTerm = settings?.currentTerm ?? detectCurrentTerm();
    const fromSession = settings?.currentSession || detectCurrentSession();
    const toTerm = parsed.data.targetTerm ?? advanceTerm(fromTerm);
    const toSession = parsed.data.targetSession ?? (toTerm === 1 ? advanceSession(fromSession) : fromSession);
    const expectedTerm = advanceTerm(fromTerm);
    const expectedSession = expectedTerm === 1 ? advanceSession(fromSession) : fromSession;
    if (toTerm !== expectedTerm || toSession !== expectedSession) {
      return res.status(400).json({ error: 'Preview the next academic period from the current school term.' });
    }
    const [classes, students, teachers] = await Promise.all([
      prisma.class.findMany({ where: { schoolId }, orderBy: { className: 'asc' } }),
      prisma.student.findMany({ where: { schoolId }, orderBy: { fullName: 'asc' } }),
      prisma.user.findMany({ where: { schoolId, role: 'teacher' }, select: teacherFields, orderBy: { fullName: 'asc' } }),
    ]);
    const classRows = classes.map(c => ({
      id: c.id, className: c.className, level: c.level,
      teacherId: c.teacherId, teacherName: c.teacherName || null,
      studentCount: students.filter(s => s.classId === c.id).length,
      teacherAssigned: Boolean(c.teacherId),
    }));
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      schoolId,
      from: { term: fromTerm, session: fromSession },
      to: { term: toTerm, session: toSession },
      isSameSession: toSession === fromSession,
      rollover: {
        classes: classRows,
        studentCount: students.length,
        teacherCount: teachers.length,
        classesWithoutTeacher: classRows.filter(c => !c.teacherAssigned).map(c => c.className),
        studentsNotInClass: students.filter(s => !s.classId).length,
      },
    });
  } catch (e) { next(e); }
});

// ─── Term/Session rollover apply ─────────────────────────────────────
// Advances the school's current term/session (roster remains unchanged within
// the same session). Returns 409 if the registry is already on that term.
router.post('/rollover/apply', async (req, res, next) => {
  try {
    const schema = z.object({
      fromTerm: z.number().int().min(1).max(3),
      fromSession: z.string().regex(/^\d{4}\/\d{4}$/),
      targetTerm: z.number().int().min(1).max(3),
      targetSession: z.string().regex(/^\d{4}\/\d{4}$/, 'Session must look like 2025/2026'),
    }).strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please provide a valid target term and session.' });
    const schoolId = req.user!.schoolId!;
    const updated = await prisma.$transaction(async tx => {
      const settings = await tx.schoolSettings.findUnique({ where: { schoolId } });
      if (!settings) throw new StaleRegistryPlan('Set the school academic period before applying a rollover.');
      const currentSession = settings.currentSession || detectCurrentSession();
      const expectedTerm = advanceTerm(settings.currentTerm);
      const expectedSession = expectedTerm === 1 ? advanceSession(currentSession) : currentSession;
      if (settings.currentTerm !== parsed.data.fromTerm || currentSession !== parsed.data.fromSession ||
          parsed.data.targetTerm !== expectedTerm || parsed.data.targetSession !== expectedSession) {
        throw new StaleRegistryPlan('The school period changed. Preview the rollover again.');
      }
      const changed = await tx.schoolSettings.updateMany({
        where: { schoolId, currentTerm: settings.currentTerm, currentSession: settings.currentSession },
        data: { currentTerm: expectedTerm, currentSession: expectedSession },
      });
      if (changed.count !== 1) throw new StaleRegistryPlan('The school period changed. Preview the rollover again.');
      return { currentTerm: expectedTerm, currentSession: expectedSession };
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ schoolId, currentTerm: updated.currentTerm, currentSession: updated.currentSession, applied: true });
  } catch (e) {
    if (e instanceof StaleRegistryPlan) return res.status(409).json({ error: e.message });
    next(e);
  }
});

// ─── Next-session promotion preview (preview-first, with exceptions) ─
// Computes a proposed promotion map for every active student without changing
// the database. Pass `exceptions` (studentId -> target classId, or "skip") to
// compute an alternate proposal; the UI can then send the approved plan to
// /promotion/apply.
router.post('/promotion/preview', async (req, res, next) => {
  try {
    const schema = z.object({
      targetSession: z.string().regex(/^\d{4}\/\d{4}$/, 'Session must look like 2025/2026').optional(),
      exceptions: z.record(z.string(), z.union([z.number().int().positive(), z.literal('skip')])).optional(),
    }).strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please provide a valid promotion preview.' });
    const schoolId = req.user!.schoolId!;
    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });
    const fromSession = settings?.currentSession || detectCurrentSession();
    const toSession = parsed.data.targetSession ?? advanceSession(fromSession);
    if (toSession !== advanceSession(fromSession)) {
      return res.status(400).json({ error: 'Preview the next school session from the current one.' });
    }
    const [classes, students] = await Promise.all([
      prisma.class.findMany({ where: { schoolId }, orderBy: { className: 'asc' } }),
      prisma.student.findMany({ where: { schoolId, status: 'Active' }, orderBy: { fullName: 'asc' } }),
    ]);
    const classMap = new Map(classes.map(c => [c.id, c]));
    const moves = students.map(student => {
      const current = classMap.get(student.classId);
      const exception = parsed.data?.exceptions?.[String(student.id)] ?? parsed.data?.exceptions?.[student.id];
      let toClass: any | null = null;
      let action: 'promote' | 'skip' | 'graduate' = 'skip';
      if (typeof exception === 'number') {
        toClass = exception === student.classId ? current : (classMap.get(exception) || null);
        if (!toClass) {
          return { studentId: student.id, fullName: student.fullName, admissionNumber: student.admissionNumber, status: student.status, fromClass: current ? { id: current.id, className: current.className, level: current.level } : null, toClass: null, action: 'skip', reason: 'Exception target class not found.' };
        }
        action = 'promote';
      } else if (exception === 'skip') {
        return { studentId: student.id, fullName: student.fullName, admissionNumber: student.admissionNumber, status: student.status, fromClass: current ? { id: current.id, className: current.className, level: current.level } : null, toClass: current ? { id: current.id, className: current.className, level: current.level } : null, action: 'skip', reason: 'Kept in current class by exception.' };
      } else if (!current) {
        return { studentId: student.id, fullName: student.fullName, admissionNumber: student.admissionNumber, status: student.status, fromClass: null, toClass: null, action: 'skip', reason: 'Student is not assigned to a class.' };
      } else {
        const next = recommendNextClass(current.level, current.className, classes);
        toClass = next ? { id: next.id, className: next.className, level: next.level } : null;
        action = next ? 'promote' : 'graduate';
      }
      const from = current ? { id: current.id, className: current.className, level: current.level } : null;
      const to = toClass ? { id: toClass.id, className: toClass.className, level: toClass.level } : null;
      const reason = action === 'graduate'
        ? 'No higher class available in this school.'
        : action === 'promote'
          ? 'Moves to the next academic level / class.'
          : 'Kept in current class.';
      return { studentId: student.id, fullName: student.fullName, admissionNumber: student.admissionNumber, status: student.status, fromClass: from, toClass: to, action, reason };
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ schoolId, fromSession, toSession, moves, summary: {
      total: moves.length,
      promote: moves.filter(m => m.action === 'promote').length,
      graduate: moves.filter(m => m.action === 'graduate').length,
      skip: moves.filter(m => m.action === 'skip').length,
    } });
  } catch (e) { next(e); }
});

// ─── Next-session promotion apply ────────────────────────────────────
// Applies an explicit, approved plan (studentId -> target classId) with
// duplicate protection: every ID must belong to this school, no student may be
// listed twice, and graduated students are marked Graduated. Also advances the
// current session so the new academic year is reflected in the registry.
router.post('/promotion/apply', async (req, res, next) => {
  try {
    const schema = z.object({
      fromSession: z.string().regex(/^\d{4}\/\d{4}$/),
      targetSession: z.string().regex(/^\d{4}\/\d{4}$/),
      moves: z.array(z.object({ studentId: z.number().int().positive(), fromClassId: z.number().int().positive(), toClassId: z.number().int().positive().nullable() }).strict()).min(1).max(2000),
    }).strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Please provide a valid promotion plan.' });
    const schoolId = req.user!.schoolId!;
    if (new Set(parsed.data.moves.map(m => m.studentId)).size !== parsed.data.moves.length) {
      return res.status(400).json({ error: 'Each student may appear only once in the promotion plan.' });
    }
    const applied = await prisma.$transaction(async tx => {
      const settings = await tx.schoolSettings.findUnique({ where: { schoolId } });
      if (!settings || settings.currentTerm !== 3 || settings.currentSession !== parsed.data.fromSession ||
          parsed.data.targetSession !== advanceSession(settings.currentSession)) {
        throw new StaleRegistryPlan('The school session changed or Term 3 is not complete. Preview promotions again.');
      }
      const studentIds = parsed.data.moves.map(m => m.studentId);
      const students = await tx.student.findMany({ where: { schoolId, id: { in: studentIds }, status: 'Active' }, select: { id: true, classId: true } });
      const studentMap = new Map(students.map(s => [s.id, s]));
      if (students.length !== studentIds.length || parsed.data.moves.some(m => studentMap.get(m.studentId)?.classId !== m.fromClassId)) {
        throw new StaleRegistryPlan('A student or class assignment changed. Preview promotions again.');
      }
      const classIds = [...new Set(parsed.data.moves.filter(m => m.toClassId !== null).map(m => m.toClassId as number))];
      if (classIds.length) {
        const classes = await tx.class.findMany({ where: { schoolId, id: { in: classIds } }, select: { id: true } });
        if (classes.length !== classIds.length) throw new StaleRegistryPlan('A target class changed. Preview promotions again.');
      }
      let promoted = 0;
      let graduated = 0;
      for (const move of parsed.data.moves) {
        const result = await tx.student.updateMany({
          where: { schoolId, id: move.studentId, classId: move.fromClassId, status: 'Active' },
          data: move.toClassId === null ? { status: 'Graduated' } : { classId: move.toClassId },
        });
        if (result.count !== 1) throw new StaleRegistryPlan('A student changed. Preview promotions again.');
        if (move.toClassId === null) graduated++; else promoted++;
      }
      const changed = await tx.schoolSettings.updateMany({
        where: { schoolId, currentTerm: 3, currentSession: parsed.data.fromSession },
        data: { currentTerm: 1, currentSession: parsed.data.targetSession },
      });
      if (changed.count !== 1) throw new StaleRegistryPlan('The school session changed. Preview promotions again.');
      return { promoted, graduated, session: parsed.data.targetSession };
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ schoolId, ...applied, applied: true });
  } catch (e) {
    if (e instanceof StaleRegistryPlan) return res.status(409).json({ error: e.message });
    next(e);
  }
});

async function mutate(req: any, res: any, next: any) {
  try {
    const kind = req.params.kind as keyof typeof schemas;
    if (!Object.hasOwn(schemas, kind)) return res.status(404).json({ error: 'Unknown registry collection.' });
    const id = req.params.id ? Number(req.params.id) : undefined;
    if (req.params.id && (!Number.isSafeInteger(id) || id! <= 0)) return res.status(400).json({ error: 'Invalid record ID.' });
    const schoolId = req.user.schoolId;
    const model: any = kind === 'classes' ? prisma.class : kind === 'students' ? prisma.student : kind === 'subjects' ? prisma.subject : prisma.user;
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
    if (kind === 'students' && data.classId !== undefined && !await prisma.class.findFirst({ where: { id: data.classId, schoolId }, select: { id: true } })) return res.status(400).json({ error: 'Choose a class belonging to your school.' });
    if (id) {
      // Never rewrite an existing student's admission number on update; and an
      // empty admissionNumber on update means "keep the current one".
      if (kind === 'students' && (data.admissionNumber === undefined || data.admissionNumber === '')) delete data.admissionNumber;
      await model.updateMany({ where, data });
      return res.json({ saved: true, record: await model.findFirst({ where, select: kind === 'teachers' ? teacherFields : undefined }) });
    }
    // New students get a derived admission number (school abbreviation + next
    // sequence) only when the registrar did not supply one.
    if (kind === 'students' && (data.admissionNumber === undefined || data.admissionNumber === '')) {
      const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
      data.admissionNumber = await nextAdmissionNumber(schoolId, schoolAbbreviation(school?.name));
    }
    // Teacher records have no login credentials until an explicit activation flow.
    const created = kind === 'teachers'
      ? await model.create({ data: { ...data, schoolId, role: 'teacher', status: 'pending_activation', isAdmin: false, isSuperAdmin: false } })
      : await model.create({ data: { ...data, schoolId } });
    return res.status(201).json({ saved: true, record: kind === 'teachers' ? { id: created.id, schoolId: created.schoolId, fullName: created.fullName, email: created.email, phone: created.phone, status: created.status } : created });
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'A record with these details already exists in your school.' });
    next(e);
  }
}
router.post('/:kind', mutate);
router.put('/:kind/:id', mutate);
router.delete('/:kind/:id', mutate);
export default router;
