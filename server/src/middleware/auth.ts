import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  schoolId?: string | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  studentId?: number | null;
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
 * Middleware: Verify JWT and attach user context to req.user.
 * Checks HttpOnly cookie first, then Authorization Bearer header.
 * Rejects with 401 if the token is missing, malformed, or expired.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
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

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
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

