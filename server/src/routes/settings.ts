import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate, enforceTenant);

// ─── GET /api/settings ───────────────────────────────────────────────
// Any authenticated tenant user can read school configuration
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await req.tenantDb!.settings.get();
    res.json({ settings });
  } catch (err) {
    console.error('[Settings Get Error]', err);
    res.status(500).json({ error: 'Failed to fetch school settings.' });
  }
});

// ─── PUT /api/settings ───────────────────────────────────────────────
// Admin only can mutate school configuration
router.put('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = await req.tenantDb!.settings.update(req.body);
    res.json({ settings });
  } catch (err) {
    console.error('[Settings Update Error]', err);
    res.status(500).json({ error: 'Failed to update school settings.' });
  }
});

export default router;
