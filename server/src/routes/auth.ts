import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, signToken, setAuthCookie, clearAuthCookie, type JwtPayload } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { requireAdmin } from '../middleware/rbac.js';
import { setCsrfCookie, CSRF_COOKIE_NAME } from '../middleware/csrf.js';
import { allocateSchoolSlug } from '../scripts/backfillSlugs.js';
import { loginRateLimiter, forgotPasswordRateLimiter, resetPasswordRateLimiter } from '../middleware/rateLimit.js';
import { sendSystemEmail, redactTransportError } from '../lib/mailSink.js';

const router = Router();

router.get('/capabilities', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ emailEnabled: process.env.EMAIL_DELIVERY_MODE !== 'disabled' });
});

router.use((req, res, next) => {
  if (process.env.EMAIL_DELIVERY_MODE === 'disabled' && req.method === 'POST' && ['/forgot-password', '/invite'].includes(req.path)) {
    res.status(503).json({ error: 'Email invitations and password recovery are not enabled for this demo. Please contact the administrator.' });
    return;
  }
  next();
});

// Comparable bcrypt hash to align computational workload on absent vs present accounts.
// Note: mitigates coarse timing differences between existing vs non-existent accounts;
// does not claim to eliminate all timing attacks, as existing hashes may have different work factors or microarchitectural cache timing.
const DUMMY_BCRYPT_HASH = '$2a$12$e8h02UoJgqIq71aEaQG1.O2H6R8YkYk7X7X7X7X7X7X7X7X7X7X7X';

// Uniform response message for password recovery requests
const UNIFORM_FORGOT_PASSWORD_RESPONSE = {
  message: 'If an account is associated with that email, a password reset link has been sent.',
};

/**
 * Determine the explicit approved HTTPS recovery origin for link generation.
 * 
 * SECURITY INVARIANT:
 * - Never blindly trust raw client-supplied Host headers.
 * - DNS ownership verification alone does NOT mean a custom domain is ready to serve
 *   password-reset pages (e.g. TLS certificates or DNS A/CNAME may not be configured yet).
 * - Only explicitly approved origins (from APPROVED_RECOVERY_ORIGINS, or the central platform host)
 *   are ever used for password recovery links.
 * - School users requesting recovery from the central platform portal receive links on the
 *   approved platform origin.
 */
function getApprovedOrigin(req: Request, school?: { slug?: string; customDomain?: string | null; customDomainVerified?: boolean } | null): string {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredClient = process.env.CLIENT_URL;

  const explicitlyApproved = process.env.APPROVED_RECOVERY_ORIGINS
    ? process.env.APPROVED_RECOVERY_ORIGINS.split(',').map((o) => o.trim())
    : [];

  // If on a school portal: only use school custom domain if explicitly in APPROVED_RECOVERY_ORIGINS
  if (req.resolvedSchool) {
    if (req.resolvedSchool.customDomain && req.resolvedSchool.customDomainVerified) {
      const customOrigin = `https://${req.resolvedSchool.customDomain}`;
      if (explicitlyApproved.includes(customOrigin)) {
        return customOrigin;
      }
    }
    const baseDomain = process.env.PLATFORM_BASE_DOMAINS?.split(',')[0]?.trim();
    if (baseDomain && req.resolvedSchool.slug) {
      const subOrigin = `https://${req.resolvedSchool.slug}.${baseDomain}`;
      if (explicitlyApproved.includes(subOrigin) || !isProd) {
        return subOrigin;
      }
    }
  }

  // Central platform portal origin (allows school users who log in on platform portal to recover there)
  if (configuredClient) {
    return configuredClient;
  }

  const platformHost = process.env.PLATFORM_HOSTS?.split(',')[0]?.trim();
  if (platformHost) {
    return `https://${platformHost}`;
  }

  if (isProd) throw new Error('A recovery origin must be configured.');
  return 'http://localhost:3000';
}

// ─── Validation Schemas ──────────────────────────────────────────────

const registerSchema = z.object({
  schoolName: z.string().trim().min(2, 'School name must be at least 2 characters').max(100),
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

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(16, 'Valid reset token is required'),
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

    // Registration must occur on the central platform host, not inside an individual school portal
    if (req.resolvedSchool) {
      res.status(400).json({ error: 'School registration must be completed on the main SeferNote platform.' });
      return;
    }

    const { schoolName, email, password, fullName, address, slogan } = parsed.data;

    // Hash the initial admin's password
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const candidateSlug = await allocateSchoolSlug(tx, schoolName);

      const school = await tx.school.create({
        data: {
          name: schoolName,
          slug: candidateSlug,
          portalTitle: `${schoolName} Portal`,
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
          tokenVersion: 0,
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
      tokenVersion: result.user.tokenVersion,
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
// Rate limited by IP and normalized account email.

router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
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

    // If user does not exist, run comparable bcrypt comparison to mitigate timing leaks
    if (!user) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
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

    // Hostname/Tenant Agreement: Reject wrong-school login before issuing session cookie!
    if (req.resolvedSchool) {
      if (user.isSuperAdmin || user.role === 'superadmin') {
        res.status(403).json({ error: 'Superadmin accounts must log in via the central platform portal.' });
        return;
      }
      if (user.schoolId !== req.resolvedSchool.id) {
        res.status(403).json({ error: 'Your account does not belong to this school portal.' });
        return;
      }
    }

    const tokenPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      studentId: user.studentId,
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
// Server-Side Session Revocation:
// 1. Authenticates current session (must be valid)
// 2. Increments `tokenVersion` in database, revoking all active sessions across all devices
// 3. Clears both HttpOnly session cookie and CSRF cookie

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    // Only increment version for the verified authenticated user (never an unverified token)
    if (req.user?.userId) {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { tokenVersion: { increment: 1 } },
      });
    }

    clearAuthCookie(res);
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[Logout Error]', err);
    // Still clear cookies on client even if DB update errored
    clearAuthCookie(res);
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
    res.json({ message: 'Logged out successfully.' });
  }
});

// ─── POST /api/auth/invite ───────────────────────────────────────────
// Admin invites user. Generates 32-byte raw token and stores SHA-256 hash.

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

    if ((role === 'student') !== Boolean(studentId)) {
      res.status(400).json({ error: 'A student account must link to one student record; staff accounts cannot link to a student.' });
      return;
    }
    if (studentId) {
      const [pupil, existingAccount] = await Promise.all([
        prisma.student.findFirst({ where: { id: studentId, schoolId: req.user!.schoolId!, status: 'Active' }, select: { id: true } }),
        prisma.user.findFirst({ where: { studentId, schoolId: req.user!.schoolId! }, select: { id: true } }),
      ]);
      if (!pupil) { res.status(400).json({ error: 'Select an active student in your school.' }); return; }
      if (existingAccount) { res.status(409).json({ error: 'This student already has a portal account.' }); return; }
    }

    // Generate secure 32-byte activation token
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenHash = crypto.createHash('sha256').update(setupToken).digest('hex');
    const setupTokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

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
        passwordHash: null,
        setupToken: null,
        setupTokenHash,
        setupTokenExpires,
      },
    });

    const origin = getApprovedOrigin(req);
    const setupUrl = `${origin}/setup-password?token=${setupToken}`;

    // Dispatch via outbound mail dispatcher / local development sink
    await sendSystemEmail({
      to: user.email,
      subject: 'Invitation to SeferNote School Portal',
      template: 'invitation',
      link: setupUrl,
      recipientName: fullName,
    });

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
// Read-only verification. Must NOT consume token.

router.get('/verify-setup-token', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(400).json({ error: 'Token query parameter is required.' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { setupTokenHash: tokenHash },
          { setupToken: token },
        ],
        setupTokenExpires: { gt: new Date() },
      },
      include: { school: { select: { id: true, name: true } } },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired setup token.' });
      return;
    }

    if (req.resolvedSchool && user.schoolId !== req.resolvedSchool.id) {
      res.status(403).json({ error: 'This activation link belongs to a different school portal.' });
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
    console.error('[Verify Setup Token Error]', err);
    res.status(500).json({ error: 'Failed to verify token.' });
  }
});

// ─── POST /api/auth/setup-password ───────────────────────────────────
// Atomic Token Consumption:
// Conditionally consumes unexpired token and updates password/tokenVersion in ONE transaction.
// Concurrency safe: concurrent duplicate requests will see count = 0 and fail.

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
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Hostname and existence check before consuming
    const candidate = await prisma.user.findFirst({
      where: {
        OR: [
          { setupTokenHash: tokenHash },
          { setupToken: token },
        ],
        setupTokenExpires: { gt: new Date() },
      },
      select: { id: true, schoolId: true },
    });

    if (!candidate) {
      res.status(400).json({ error: 'Invalid, expired, or already used setup token.' });
      return;
    }

    if (req.resolvedSchool && candidate.schoolId !== req.resolvedSchool.id) {
      res.status(403).json({ error: 'This activation link belongs to a different school portal.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Atomic transaction: conditionally consume unexpired token
    const result = await prisma.$transaction(async (tx) => {
      const updateRes = await tx.user.updateMany({
        where: {
          id: candidate.id,
          OR: [
            { setupTokenHash: tokenHash },
            { setupToken: token },
          ],
          setupTokenExpires: { gt: new Date() },
        },
        data: {
          passwordHash,
          setupToken: null,
          setupTokenHash: null,
          setupTokenExpires: null,
          status: 'active',
          tokenVersion: { increment: 1 },
        },
      });

      if (updateRes.count !== 1) {
        return null;
      }

      return tx.user.findUnique({
        where: { id: candidate.id },
        include: { school: { select: { id: true, name: true } } },
      });
    });

    if (!result) {
      res.status(400).json({ error: 'Invalid, expired, or already used setup token.' });
      return;
    }

    const tokenPayload: JwtPayload = {
      userId: result.id,
      email: result.email,
      role: result.role,
      schoolId: result.schoolId,
      isAdmin: result.isAdmin,
      isSuperAdmin: result.isSuperAdmin,
      studentId: result.studentId,
      tokenVersion: result.tokenVersion,
    };

    const jwtToken = signToken(tokenPayload);
    setAuthCookie(res, jwtToken);
    setCsrfCookie(res);

    res.json({
      message: 'Password created successfully. Account is now active.',
      token: jwtToken,
      user: {
        id: result.id,
        email: result.email,
        fullName: result.fullName,
        role: result.role,
        schoolId: result.schoolId,
        isAdmin: result.isAdmin,
        studentId: result.studentId,
        status: result.status,
      },
      school: result.school,
    });
  } catch (err) {
    console.error('[Setup Password Error]', err);
    res.status(500).json({ error: 'Failed to set password.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────
// Zero-Enumeration Password Recovery Request:
// Always returns the exact same 200 message across non-existent, wrong-school, and inactive accounts.

router.post('/forgot-password', forgotPasswordRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      include: { school: { select: { id: true, name: true, slug: true, customDomain: true, customDomainVerified: true } } },
    });

    // Check account validity and tenant match
    let shouldSendReset = true;

    if (!user || user.status !== 'active') {
      shouldSendReset = false;
      await bcrypt.compare('dummy_input', DUMMY_BCRYPT_HASH);
    } else if (req.resolvedSchool && (user.isSuperAdmin || user.role === 'superadmin' || user.schoolId !== req.resolvedSchool.id)) {
      // Wrong-school or superadmin on school portal: do NOT send email, do NOT return 403.
      // Must return identical uniform response.
      shouldSendReset = false;
      await bcrypt.compare('dummy_input', DUMMY_BCRYPT_HASH);
    }

    if (shouldSendReset && user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash,
          resetTokenExpires,
        },
      });

      const origin = getApprovedOrigin(req, user.school);
      const resetUrl = `${origin}/reset-password?token=${resetToken}`;

      try {
        await sendSystemEmail({
          to: user.email,
          subject: 'SeferNote Password Reset Request',
          template: 'password-reset',
          link: resetUrl,
          recipientName: user.fullName,
          schoolName: user.school?.name,
        });
      } catch (mailErr) {
        // Mail failure must NOT crash the server or reveal user existence
        console.error('[Mail Delivery Failure]', redactTransportError(mailErr));
      }
    }

    res.json(UNIFORM_FORGOT_PASSWORD_RESPONSE);
  } catch (err) {
    console.error('[Forgot Password Error]', err);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// ─── GET /api/auth/verify-reset-token ─────────────────────────────────
// Read-only verification of password reset token. Does NOT consume token.

router.get('/verify-reset-token', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(400).json({ error: 'Token query parameter is required.' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpires: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        schoolId: true,
      },
    });

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired password reset link.' });
      return;
    }

    if (req.resolvedSchool && user.schoolId !== req.resolvedSchool.id) {
      res.status(403).json({ error: 'This password reset link belongs to a different school portal.' });
      return;
    }

    res.json({
      valid: true,
      email: user.email,
    });
  } catch (err) {
    console.error('[Verify Reset Token Error]', err);
    res.status(500).json({ error: 'Failed to verify reset token.' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────
// Atomic Token Consumption:
// Consumes reset token and sets new password in ONE transaction.
// Increments `tokenVersion`, invalidating all existing sessions across all devices.

router.post('/reset-password', resetPasswordRateLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { token, password } = parsed.data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Hostname check before consuming
    if (req.resolvedSchool) {
      const candidate = await prisma.user.findFirst({
        where: { resetTokenHash: tokenHash },
        select: { schoolId: true },
      });
      if (candidate && candidate.schoolId !== req.resolvedSchool.id) {
        res.status(403).json({ error: 'This password reset link belongs to a different school portal.' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Atomic transaction: conditionally consume unexpired reset token
    const result = await prisma.$transaction(async (tx) => {
      const updateRes = await tx.user.updateMany({
        where: {
          resetTokenHash: tokenHash,
          resetTokenExpires: { gt: new Date() },
        },
        data: {
          passwordHash,
          resetTokenHash: null,
          resetTokenExpires: null,
          tokenVersion: { increment: 1 }, // Revokes all sessions on all devices
        },
      });

      if (updateRes.count !== 1) {
        return null;
      }

      return true;
    });

    if (!result) {
      res.status(400).json({ error: 'Password reset link is invalid, expired, or has already been used.' });
      return;
    }

    res.json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (err) {
    console.error('[Reset Password Error]', err);
    res.status(500).json({ error: 'Failed to reset password.' });
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

    // Hostname/Tenant Agreement: Assert session matches current school portal
    if (req.resolvedSchool) {
      if (user.isSuperAdmin || user.role === 'superadmin') {
        res.status(403).json({ error: 'Superadmin sessions are restricted to platform administration routes.' });
        return;
      }
      if (user.schoolId !== req.resolvedSchool.id) {
        res.status(403).json({ error: 'Hostname tenant mismatch: Your session belongs to a different school portal.' });
        return;
      }
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
// Increments tokenVersion to revoke old sessions across all devices.

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
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 }, // Revoke old sessions across devices
      },
    });

    // Re-issue cookie with new tokenVersion for the active session
    const tokenPayload: JwtPayload = {
      userId: updated.id,
      email: updated.email,
      role: updated.role,
      schoolId: updated.schoolId,
      isAdmin: updated.isAdmin,
      isSuperAdmin: updated.isSuperAdmin,
      studentId: updated.studentId,
      tokenVersion: updated.tokenVersion,
    };
    const token = signToken(tokenPayload);
    setAuthCookie(res, token);
    setCsrfCookie(res);

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[Change Password Error]', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

export default router;
