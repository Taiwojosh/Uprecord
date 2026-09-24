import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { requireAdmin, requireTeacherOrAdmin, requireSelfOrStaff } from '../middleware/rbac.js';
import { TenantIsolationError } from '../dal/tenantDb.js';

const router = Router();

// Enforce authentication and tenant scoping on all student routes
router.use(authenticate, enforceTenant);

const createStudentSchema = z.object({
  admissionNumber: z.string().min(1, 'Admission number is required'),
  fullName: z.string().min(2, 'Full name is required'),
  gender: z.enum(['Male', 'Female']),
  classId: z.number().int().positive('Valid classId is required'),
  dateOfBirth: z.string().optional(),
  departmentId: z.number().optional(),
  departmentName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  parentPhone: z.string().optional(),
  parentEmail: z.string().email().optional().or(z.literal('')),
});

const updateStudentSchema = createStudentSchema.partial();

// ─── GET /api/students ───────────────────────────────────────────────
// Staff only (Admin & Teacher). Students cannot list school roster.
router.get('/', requireTeacherOrAdmin, async (req: Request, res: Response) => {
  try {
    const students = await req.tenantDb!.students.findMany({
      orderBy: { fullName: 'asc' },
    });
    res.json({ students });
  } catch (err) {
    console.error('[Students List Error]', err);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// ─── GET /api/students/:id ───────────────────────────────────────────
// Staff (Admin/Teacher) or the individual student themself
router.get('/:id', requireSelfOrStaff(req => parseInt(req.params.id, 10)), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid student ID.' });
      return;
    }

    const student = await req.tenantDb!.students.findById(id);
    if (!student) {
      res.status(404).json({ error: 'Student not found in this school.' });
      return;
    }

    res.json({ student });
  } catch (err) {
    console.error('[Student Get Error]', err);
    res.status(500).json({ error: 'Failed to fetch student.' });
  }
});

// ─── POST /api/students ──────────────────────────────────────────────
// Admin only
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    if (!await req.tenantDb!.classes.findById(parsed.data.classId)) {
      res.status(400).json({ error: 'Choose a class belonging to your school.' });
      return;
    }
    const student = await req.tenantDb!.students.create(parsed.data);
    res.status(201).json({ student });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A student with this admission number already exists in your school.' });
      return;
    }
    console.error('[Student Create Error]', err);
    res.status(500).json({ error: 'Failed to create student.' });
  }
});

// ─── PUT /api/students/:id ───────────────────────────────────────────
// Admin only
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid student ID.' });
      return;
    }

    const parsed = updateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    if (parsed.data.classId !== undefined && !await req.tenantDb!.classes.findById(parsed.data.classId)) {
      res.status(400).json({ error: 'Choose a class belonging to your school.' });
      return;
    }
    const student = await req.tenantDb!.students.update(id, parsed.data);
    res.json({ student });
  } catch (err: any) {
    if (err instanceof TenantIsolationError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[Student Update Error]', err);
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

// ─── DELETE /api/students/:id ────────────────────────────────────────
// Admin only
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid student ID.' });
      return;
    }

    await req.tenantDb!.students.delete(id);
    res.json({ message: 'Student deleted successfully.' });
  } catch (err: any) {
    if (err instanceof TenantIsolationError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[Student Delete Error]', err);
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

export default router;
