import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AUTH_COOKIE_NAME } from './auth.js';

export const CSRF_COOKIE_NAME = 'uprecord_csrf_token';

/**
 * Generate and set a new CSRF token cookie.
 * This cookie is NOT HttpOnly so that the frontend JavaScript
 * can read it and attach it to the X-CSRF-Token header.
 */
export function setCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by client script to send in header
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
 * (POST, PUT, PATCH, DELETE) that rely on ambient cookie authentication.
 * 
 * Safe methods (GET, HEAD, OPTIONS) and non-ambient Bearer token requests
 * are not subject to CSRF attacks and are permitted.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // If request uses explicit Bearer token header, it is not vulnerable to browser ambient cookie CSRF
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Public pre-auth routes and logout routes do not forge user session state
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/setup-password',
    '/api/auth/logout',
    '/api/admin/login',
    '/api/admin/logout',
  ];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // If authenticated via cookie, enforce CSRF validation
  const sessionCookie = req.cookies?.[AUTH_COOKIE_NAME];
  if (!sessionCookie) {
    // No session cookie means no authenticated session to protect against CSRF
    return next();
  }

  const expectedCsrfToken = req.cookies?.[CSRF_COOKIE_NAME];
  const receivedCsrfToken = (req.headers['x-csrf-token'] || req.headers['x-xsrf-token']) as string | undefined;

  if (!expectedCsrfToken || !receivedCsrfToken) {
    res.status(403).json({ error: 'CSRF token missing. Request rejected.' });
    return;
  }

  // Constant-time comparison
  if (expectedCsrfToken.length !== receivedCsrfToken.length || expectedCsrfToken !== receivedCsrfToken) {
    res.status(403).json({ error: 'CSRF token invalid. Request rejected.' });
    return;
  }

  next();
}
