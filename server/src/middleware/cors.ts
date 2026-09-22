import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';

/**
 * Strict Credentialed CORS Configuration
 * 
 * Accounts for:
 * 1. Default configured CLIENT_URL
 * 2. Local development origins (localhost:3000, localhost:5173)
 * 3. Future custom school domains (via ALLOWED_ORIGINS env, *.uprecord.edu, or same-origin host match)
 * 4. Strictly sets credentials: true with exact origin reflection (never wildcard '*')
 */

function getAllowedOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL);
  }

  // Support comma-separated extra domains from environment
  if (process.env.ALLOWED_ORIGINS) {
    const extra = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
    origins.push(...extra);
  }

  // Allowed custom domain patterns (e.g. *.uprecord.edu, *.uprecord.local)
  origins.push(/^https?:\/\/([a-zA-Z0-9-]+\.)*uprecord\.(edu|local|app)$/);

  return origins;
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl, same-origin navigations, mobile apps)
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowedOrigins = getAllowedOrigins();

    const isAllowed = allowedOrigins.some((allowed) => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS Error: Origin '${origin}' is not allowed by policy.`));
    }
  },
  credentials: true, // Required for HttpOnly cookies across origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-csrf-token', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours preflight cache
};

export const corsMiddleware = cors(corsOptions);
