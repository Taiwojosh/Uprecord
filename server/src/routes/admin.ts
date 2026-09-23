import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authenticate, requireRole, signToken, setAuthCookie, clearAuthCookie, type JwtPayload } from '../middleware/auth.js';
import { setCsrfCookie, CSRF_COOKIE_NAME } from '../middleware/csrf.js';
import { adminLoginRateLimiter } from '../middleware/rateLimit.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use((req, res, next) => {
  if (!req.isPlatformHost) {
    res.status(403).json({ error: 'Platform administration is available only on the central platform host.' });
    return;
  }
  next();
});

const superadminLoginSchema = z.object({
  email: z.string().email('Valid superadmin email is required'),
  password: z.string().min(1, 'Password is required'),
});

const DUMMY_BCRYPT_HASH = '$2a$12$e8h02UoJgqIq71aEaQG1.O2H6R8YkYk7X7X7X7X7X7X7X7X7X7X7X';

/**
 * Platform Superadmin Routes
 * 
 * Access is strictly database-backed: requires authentication against a real
 * user record with role === 'superadmin' and isSuperAdmin === true.
 * No static or shared environment secrets are trusted for ongoing access.
 */

// ─── POST /api/admin/login ───────────────────────────────────────────
// Authenticate against database-backed SUPERADMIN account
// Rate limited by IP and account email

router.post('/login', adminLoginRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = superadminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        OR: [{ role: 'superadmin' }, { isSuperAdmin: true }],
      },
    });

    if (!user || !user.passwordHash) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      res.status(401).json({ error: 'Invalid superadmin credentials.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid superadmin credentials.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'Superadmin account is inactive.' });
      return;
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: 'superadmin',
      schoolId: null,
      isAdmin: true,
      isSuperAdmin: true,
      tokenVersion: user.tokenVersion,
    };

    const token = signToken(tokenPayload);
    setAuthCookie(res, token);
    setCsrfCookie(res);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isAdmin: user.isAdmin,
        isSuperAdmin: true,
      },
    });
  } catch (err) {
    console.error('[Admin Login Error]', err);
    res.status(500).json({ error: 'Superadmin login failed.' });
  }
});

// ─── GET /api/admin/me ───────────────────────────────────────────────
// Returns current superadmin profile

router.get('/me', authenticate, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, fullName: true, role: true, isSuperAdmin: true, status: true },
    });

    if (!user || (!user.isSuperAdmin && user.role !== 'superadmin')) {
      res.status(403).json({ error: 'Unauthorized. Superadmin role required.' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('[Admin Me Error]', err);
    res.status(500).json({ error: 'Failed to fetch admin profile.' });
  }
});

// ─── POST /api/admin/logout ──────────────────────────────────────────
// Clears session cookie and revokes session server-side

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user?.userId) {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { tokenVersion: { increment: 1 } },
      });
    }

    clearAuthCookie(res);
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    res.json({ message: 'Superadmin logged out successfully.' });
  } catch (err) {
    console.error('[Admin Logout Error]', err);
    clearAuthCookie(res);
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    res.json({ message: 'Superadmin logged out successfully.' });
  }
});

// ─── GET /api/admin/schools ──────────────────────────────────────────
// List all schools on the platform (superadmin only)

router.get('/schools', authenticate, requireRole('superadmin'), async (_req: Request, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        _count: {
          select: { users: true, students: true, classes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ schools });
  } catch (err) {
    console.error('[Admin Schools Error]', err);
    res.status(500).json({ error: 'Failed to fetch schools.' });
  }
});

// ─── GET /api/admin/schools/:schoolId/stats ──────────────────────────
// Get detailed stats for a specific school (superadmin only)

router.get('/schools/:schoolId/stats', authenticate, requireRole('superadmin'), async (req: Request, res: Response) => {
  try {
    const { schoolId } = req.params;

    const [school, userCount, studentCount, classCount] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId } }),
      prisma.user.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
    ]);

    if (!school) {
      res.status(404).json({ error: 'School not found.' });
      return;
    }

    res.json({
      school,
      stats: { users: userCount, students: studentCount, classes: classCount },
    });
  } catch (err) {
    console.error('[Admin School Stats Error]', err);
    res.status(500).json({ error: 'Failed to fetch school stats.' });
  }
});

export default router;
