import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  schoolId?: string | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  studentId?: number | null;
  tokenVersion: number;
}

// Extend Express Request to carry verified user context
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION';
export const AUTH_COOKIE_NAME = 'uprecord_token';

/**
 * Configure and set the HttpOnly, Secure, SameSite session cookie.
 * 
 * SECURITY INVARIANT:
 * The authentication cookie is strictly HttpOnly (`httpOnly: true`) to prevent
 * cross-site scripting (XSS) extraction of the session credential.
 */
export function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Clear the authentication cookie upon logout.
 */
export function clearAuthCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
}

/**
 * Middleware: Verify JWT and attach verified user context to req.user.
 * 
 * Enforces:
 * 1. Valid cryptographic signature and unexpired JWT.
 * 2. Mandatory `tokenVersion` claim. Legacy tokens without tokenVersion are
 *    strictly rejected with 401, requiring fresh login.
 * 3. Database existence and active status. Suspended or deleted users are
 *    rejected immediately.
 * 4. Multi-Device Revocation: `tokenVersion` in JWT must match database `tokenVersion`.
 *    Logging out or resetting password increments the user's `tokenVersion`, instantly
 *    invalidating all active sessions across all devices.
 * 5. School Binding Preservation: `decoded.schoolId` must match database `user.schoolId`.
 *    Old sessions are NEVER silently upgraded to access a newly assigned school;
 *    school membership mismatches are rejected with 401.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined;

  // 1. Primary web auth: HttpOnly cookie
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    token = req.cookies[AUTH_COOKIE_NAME];
  }
  // 2. Fallback: Authorization header (for external API clients / mobile / integration tests)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No session or token provided.' });
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }

  // Legacy tokens lacking tokenVersion are strictly rejected
  if (decoded.tokenVersion === undefined || decoded.tokenVersion === null || typeof decoded.tokenVersion !== 'number') {
    res.status(401).json({ error: 'Legacy session without token version. Fresh login is required.' });
    return;
  }

  // Server-Side Session Validation against live Database
  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        schoolId: true,
        isAdmin: true,
        isSuperAdmin: true,
        studentId: true,
        status: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User session invalid. Account not found.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({ error: 'Account is inactive or suspended. Access denied.' });
      return;
    }

    // Check Multi-Device Revocation
    if (user.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({ error: 'Session has expired or was revoked. Please log in again.' });
      return;
    }

    // Preserve School Binding: Reject token / database school mismatches
    const tokenSchoolId = decoded.schoolId || null;
    const dbSchoolId = user.schoolId || null;

    if (tokenSchoolId !== dbSchoolId) {
      res.status(401).json({
        error: 'Session school membership mismatch. Session was revoked or school membership changed. Fresh login required.',
      });
      return;
    }

    // Attach verified user claims to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      studentId: user.studentId,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (dbErr) {
    console.error('[Authenticate DB Error]', dbErr);
    res.status(500).json({ error: 'Internal server error validating session.' });
  }
}

/**
 * Middleware factory: Restrict access to specific roles.
 * Must be used AFTER `authenticate`.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role) && !req.user.isSuperAdmin) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }

    next();
  };
}

/**
 * Sign a JWT for the given user payload.
 */
export function signToken(payload: JwtPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
