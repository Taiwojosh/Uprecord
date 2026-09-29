import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = Router();

function defaultSession(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() + 1 >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

router.use(authenticate, enforceTenant);

// ─── GET /api/settings ───────────────────────────────────────────────
// Any authenticated tenant user can read school configuration
router.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await req.tenantDb!.settings.get();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ settings: settings ? { ...settings, currentSession: settings.currentSession || defaultSession() } : null });
  } catch (err) {
    console.error('[Settings Get Error]', err);
    res.status(500).json({ error: 'Failed to fetch school settings.' });
  }
});

// ─── PUT /api/settings ───────────────────────────────────────────────
// Admin only can mutate school configuration
router.put('/', requireAdmin, async (req: Request, res: Response) => {
  if (req.body?.currentTerm !== undefined || req.body?.currentSession !== undefined) {
    return res.status(400).json({ error: 'Use the academic period endpoint to change the term or session.' });
  }
  try {
    const settings = await req.tenantDb!.settings.update(req.body);
    res.json({ settings });
  } catch (err) {
    console.error('[Settings Update Error]', err);
    res.status(500).json({ error: 'Failed to update school settings.' });
  }
});

export default router;
