import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, signToken, setAuthCookie, clearAuthCookie, type JwtPayload } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { requireAdmin } from '../middleware/rbac.js';
import { setCsrfCookie } from '../middleware/csrf.js';

const router = Router();

// ─── Validation Schemas ──────────────────────────────────────────────

const registerSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  address: z.string().optional(),
  slogan: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  fullName: z.string().min(2, 'Full name is required'),
  role: z.enum(['admin', 'teacher', 'student']),
  department: z.string().optional(),
  phone: z.string().optional(),
  studentId: z.number().int().optional(),
});

const setupPasswordSchema = z.object({
  token: z.string().min(16, 'Valid activation token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── GET /api/auth/csrf ──────────────────────────────────────────────
// Issues a CSRF token and sets the readable uprecord_csrf_token cookie

router.get('/csrf', (_req: Request, res: Response) => {
  const csrfToken = setCsrfCookie(res);
  res.json({ csrfToken });
});

// ─── POST /api/auth/register ─────────────────────────────────────────
// Creates a new School and its first Admin user.

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { schoolName, email, password, fullName, address, slogan } = parsed.data;

    // Hash the initial admin's password
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          address: address || null,
          slogan: slogan || null,
        },
      });

      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          fullName,
          role: 'admin',
          isAdmin: true,
          schoolId: school.id,
          status: 'active',
        },
      });

      // Create default school settings
      await tx.schoolSettings.create({
        data: {
          schoolId: school.id,
          schoolName,
          address: address || null,
          schoolSlogan: slogan || null,
          currentTerm: 1,
          totalSubjectScore: 100,
          examMaxScore: 60,
          caMaxScore: 40,
        },
      });

      return { school, user };
    });

    const tokenPayload: JwtPayload = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      schoolId: result.school.id,
      isAdmin: true,
    };

    const token = signToken(tokenPayload);
    setAuthCookie(res, token);
    setCsrfCookie(res);

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        schoolId: result.school.id,
        isAdmin: result.user.isAdmin,
      },
      school: {
        id: result.school.id,
        name: result.school.name,
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    console.error('[Register Error]', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────
// Authenticates credentials and issues an HttpOnly cookie session.

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      include: { school: { select: { id: true, name: true } } },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // If account has no password yet (pending activation)
    if (!user.passwordHash) {
      res.status(403).json({
        error: 'This account is awaiting initial password setup. Please use the activation link sent by your administrator.',
      });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'This account is inactive. Contact your administrator.' });
      return;
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      studentId: user.studentId,
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
        schoolId: user.schoolId,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        studentId: user.studentId,
      },
      school: user.school,
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────
// Clears the HttpOnly authentication cookie.

router.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully.' });
});

// ─── POST /api/auth/invite ───────────────────────────────────────────
// Admin creates/invites a user using an activation token flow.
// No administrator-known passwords!

router.post('/invite', authenticate, enforceTenant, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, fullName, role, department, phone, studentId } = parsed.data;

    // Generate a secure random activation token (valid 48 hours)
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        fullName,
        role,
        department: department || null,
        phone: phone || null,
        studentId: studentId || null,
        schoolId: req.user!.schoolId!,
        status: 'pending_activation',
        passwordHash: null, // Password will be chosen by the user during setup
        setupToken,
        setupTokenExpires,
      },
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const setupUrl = `${clientUrl}/setup-password?token=${setupToken}`;

    res.status(201).json({
      message: 'User invited successfully. Share the activation link with the user to set their password.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
      setupToken,
      setupUrl,
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }
    console.error('[Invite Error]', err);
    res.status(500).json({ error: 'Failed to invite user.' });
  }
});

// ─── GET /api/auth/verify-setup-token ─────────────────────────────────
// Verifies if an activation/setup token is valid and returns user info

router.get('/verify-setup-token', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(400).json({ error: 'Token query parameter is required.' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        setupToken: token,
        setupTokenExpires: { gt: new Date() },
      },
      include: { school: { select: { id: true, name: true } } },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired setup token.' });
      return;
    }

    res.json({
      valid: true,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      schoolName: user.school?.name,
    });
  } catch (err) {
    console.error('[Verify Token Error]', err);
    res.status(500).json({ error: 'Failed to verify token.' });
  }
});

// ─── POST /api/auth/setup-password ───────────────────────────────────
// User chooses their own password using their valid setup token.

router.post('/setup-password', async (req: Request, res: Response) => {
  try {
    const parsed = setupPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { token, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        setupToken: token,
        setupTokenExpires: { gt: new Date() },
      },
      include: { school: { select: { id: true, name: true } } },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired setup token.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        setupToken: null,
        setupTokenExpires: null,
        status: 'active',
      },
      include: { school: { select: { id: true, name: true } } },
    });

    const tokenPayload: JwtPayload = {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      schoolId: updatedUser.schoolId,
      isAdmin: updatedUser.isAdmin,
      isSuperAdmin: updatedUser.isSuperAdmin,
      studentId: updatedUser.studentId,
    };

    const jwtToken = signToken(tokenPayload);
    setAuthCookie(res, jwtToken);
    setCsrfCookie(res);

    res.json({
      message: 'Password created successfully. Account is now active.',
      token: jwtToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        schoolId: updatedUser.schoolId,
        isAdmin: updatedUser.isAdmin,
        studentId: updatedUser.studentId,
        status: updatedUser.status,
      },
      school: updatedUser.school,
    });
  } catch (err) {
    console.error('[Setup Password Error]', err);
    res.status(500).json({ error: 'Failed to set password.' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────
// Returns the currently authenticated user's profile.

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { school: { select: { id: true, name: true } } },
    });

    if (!user) {
      res.status(404).json({ error: 'User no longer exists.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'This account is inactive.' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        schoolId: user.schoolId,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        studentId: user.studentId,
      },
      school: user.school,
    });
  } catch (err) {
    console.error('[Me Error]', err);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

// ─── POST /api/auth/change-password ──────────────────────────────────
// Allows authenticated users to change their own password.

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user || !user.passwordHash) {
      res.status(404).json({ error: 'User not found or password not set.' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[Change Password Error]', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

export default router;
