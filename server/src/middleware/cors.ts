import cors, { CorsOptions } from 'cors';
import prisma from '../lib/prisma.js';
import { normalizeHostname, getPlatformBaseDomains } from '../config/domains.js';

/**
 * Strict Credentialed CORS Configuration
 * 
 * Enforces:
 * 1. Configured CLIENT_URL and ALLOWED_ORIGINS
 * 2. Local development origins (only outside production)
 * 3. Platform subdomains (*.<baseDomain>)
 * 4. Verified school custom domains (requires HTTPS in production)
 * 5. Rejection of unknown origins and unverified custom domains
 */

async function isOriginAllowed(origin: string): Promise<boolean> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(origin);
  } catch {
    return false;
  }

  const host = normalizeHostname(parsedUrl.hostname);
  const protocol = parsedUrl.protocol;
  const isProd = process.env.NODE_ENV === 'production';

  // In production, enforce HTTPS for all browser origins
  if (isProd && protocol !== 'https:') {
    return false;
  }

  // 1. Configured CLIENT_URL match
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
    return true;
  }

  // 2. Configured ALLOWED_ORIGINS match
  if (process.env.ALLOWED_ORIGINS) {
    const allowed = process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
    if (allowed.includes(origin)) {
      return true;
    }
  }

  // 3. Localhost origins (allowed only outside production)
  if (!isProd) {
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.localhost')
    ) {
      return true;
    }
  }

  // 4. Platform base domain subdomains (e.g. *.globepen.com, *.globepen.local)
  const baseDomains = getPlatformBaseDomains();
  for (const base of baseDomains) {
    if (host === base || host.endsWith(`.${base}`)) {
      return true;
    }
  }

  // 5. Database-backed verified custom school domains
  try {
    const school = await prisma.school.findFirst({
      where: {
        customDomain: host,
        customDomainVerified: true,
      },
      select: { id: true },
    });

    if (school) {
      return true;
    }
  } catch (err) {
    console.error('[CORS Domain Lookup Error]', err);
  }

  return false;
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl, mobile apps)
    if (!origin) {
      callback(null, true);
      return;
    }

    isOriginAllowed(origin)
      .then((allowed) => {
        if (allowed) {
          callback(null, true);
        } else {
          callback(new Error(`CORS Error: Origin '${origin}' is not allowed by policy.`));
        }
      })
      .catch((err) => {
        callback(err);
      });
  },
  credentials: true, // Required for HttpOnly cookies across portals
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-csrf-token', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // 24 hours preflight cache
};

export const corsMiddleware = cors(corsOptions);
