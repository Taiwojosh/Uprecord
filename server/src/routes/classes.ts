import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { requireAdmin, requireTeacherOrAdmin } from '../middleware/rbac.js';
import { TenantIsolationError } from '../dal/tenantDb.js';

const router = Router();

router.use(authenticate, enforceTenant);

const createClassSchema = z.object({
  className: z.string().min(1, 'Class name is required'),
  level: z.string().min(1, 'Level is required'),
  teacherName: z.string().optional(),
  teacherId: z.number().optional(),
  capacity: z.number().optional(),
  departmentId: z.number().optional(),
});

// ─── GET /api/classes ────────────────────────────────────────────────
// Staff only (Admin & Teacher)
router.get('/', requireTeacherOrAdmin, async (req: Request, res: Response) => {
  try {
    const classes = await req.tenantDb!.classes.findMany();
    res.json({ classes });
  } catch (err) {
    console.error('[Classes List Error]', err);
    res.status(500).json({ error: 'Failed to fetch classes.' });
  }
});

// ─── GET /api/classes/:id ────────────────────────────────────────────
// Staff only (Admin & Teacher)
router.get('/:id', requireTeacherOrAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid class ID.' });
      return;
    }

    const classItem = await req.tenantDb!.classes.findById(id);
    if (!classItem) {
      res.status(404).json({ error: 'Class not found in this school.' });
      return;
    }

    res.json({ class: classItem });
  } catch (err) {
    console.error('[Class Get Error]', err);
    res.status(500).json({ error: 'Failed to fetch class.' });
  }
});

// ─── POST /api/classes ───────────────────────────────────────────────
// Admin only
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createClassSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const newClass = await req.tenantDb!.classes.create(parsed.data);
    res.status(201).json({ class: newClass });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A class with this name already exists in your school.' });
      return;
    }
    console.error('[Class Create Error]', err);
    res.status(500).json({ error: 'Failed to create class.' });
  }
});

// ─── PUT /api/classes/:id ────────────────────────────────────────────
// Admin only
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid class ID.' });
      return;
    }

    const updated = await req.tenantDb!.classes.update(id, req.body);
    res.json({ class: updated });
  } catch (err: any) {
    if (err instanceof TenantIsolationError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[Class Update Error]', err);
    res.status(500).json({ error: 'Failed to update class.' });
  }
});

// ─── DELETE /api/classes/:id ─────────────────────────────────────────
// Admin only
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid class ID.' });
      return;
    }

    await req.tenantDb!.classes.delete(id);
    res.json({ message: 'Class deleted successfully.' });
  } catch (err: any) {
    if (err instanceof TenantIsolationError) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[Class Delete Error]', err);
    res.status(500).json({ error: 'Failed to delete class.' });
  }
});

export default router;
