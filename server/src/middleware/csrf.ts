import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AUTH_COOKIE_NAME } from './auth.js';

export const CSRF_COOKIE_NAME = 'uprecord_csrf_token';

/**
 * Generate and set a new CSRF token cookie.
 * 
 * SECURITY INVARIANT:
 * This cookie is NOT HttpOnly (`httpOnly: false`) so that the frontend JavaScript
 * can read it and attach it to the X-CSRF-Token header on state-modifying requests.
 * Only the authentication cookie (`uprecord_token`) is HttpOnly.
 */
export function setCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Readable by client script to send in header
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

/**
 * CSRF Protection Middleware
 * 
 * Enforces Double-Submit CSRF protection on all state-modifying requests
 * (POST, PUT, PATCH, DELETE) that authenticate using ambient cookies.
 * 
 * CRITICAL PRECEDENCE RULE:
 * A Bearer header must NEVER bypass CSRF when the request authenticates using a cookie.
 * If the session cookie is present, CSRF token verification is strictly mandatory.
 * 
 * EXCLUSION POLICY:
 * - Safe HTTP methods (GET, HEAD, OPTIONS) are exempt.
 * - Exact public pre-auth routes (login, register, setup-password, forgot-password, reset-password)
 *   are exempt via exact Set matching (never startsWith).
 * - Logout (`/api/auth/logout`, `/api/admin/logout`) is NOT exempt because logout mutates
 *   server-side session state (`tokenVersion` increment).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exact public pre-auth route matching (never startsWith)
  // Logout is explicitly excluded from this set to prevent Cross-Site Logout attacks.
  const publicPaths = new Set([
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/setup-password',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/admin/login',
  ]);

  if (publicPaths.has(req.path)) {
    return next();
  }

  const sessionCookie = req.cookies?.[AUTH_COOKIE_NAME];

  if (!sessionCookie) {
    // If no ambient session cookie is present, check if the client sent an explicit Authorization header.
    // Non-ambient Bearer token requests (e.g. external integrations, mobile apps) are not vulnerable to ambient CSRF.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return next();
    }
    // No session cookie and no Bearer token means unauthenticated request; pass to downstream auth middleware
    return next();
  }

  // When an ambient auth cookie is present, CSRF MUST be verified.
  // An attacker cannot bypass CSRF by merely attaching a dummy Authorization header.
  const expectedCsrfToken = req.cookies?.[CSRF_COOKIE_NAME];
  const receivedCsrfToken = (req.headers['x-csrf-token'] || req.headers['x-xsrf-token']) as string | undefined;

  if (!expectedCsrfToken || !receivedCsrfToken) {
    res.status(403).json({ error: 'CSRF token missing. Request rejected.' });
    return;
  }

  // Constant-time comparison to prevent timing leaks
  const expectedBuf = Buffer.from(expectedCsrfToken);
  const receivedBuf = Buffer.from(receivedCsrfToken);

  if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    res.status(403).json({ error: 'CSRF token invalid. Request rejected.' });
    return;
  }

  next();
}
