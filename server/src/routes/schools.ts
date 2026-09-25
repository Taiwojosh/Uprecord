import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import dns from 'dns';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenant } from '../middleware/tenant.js';
import { requireAdmin } from '../middleware/rbac.js';
import { getPlatformBaseDomains, isPlatformHost } from '../config/domains.js';
import type { School } from '@prisma/client';
import type { PublicBranding, SchoolManagementResponse, DomainRegistrationResponse, DomainVerificationResponse } from '../contracts/branding.js';

const router = Router();
// Branding is hostname dependent; management includes private ownership challenges.
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

function safeLogo(value: string): boolean {
  if (value.startsWith('data:')) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) return false;
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length > 1024 * 1024) return false;
    if (match[1] === 'png') return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    if (match[1] === 'jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  }
  try {
    const url = new URL(value);
    return value.length <= 2048 && url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

// ─── Input Validation Schemas ────────────────────────────────────────

const updateBrandingSchema = z.object({
  name: z.string().min(2, 'School name must be at least 2 characters').max(100).optional(),
  slogan: z.string().max(250).nullable().optional(),
  logoUrl: z.string().max(1400000).refine(safeLogo, 'Use an HTTPS image URL or a PNG, JPEG or WebP image under 1 MB').nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  portalTitle: z.string().max(100).nullable().optional(),
  brandColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Brand color must be a valid hex code (e.g. #2563EB)')
    .nullable()
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Secondary color must be a valid hex code (e.g. #1E293B)')
    .nullable()
    .optional(),
  contactEmail: z.string().email('Invalid contact email').nullable().optional().or(z.literal('')),
  contactPhone: z.string().max(30).nullable().optional(),
});

const customDomainSchema = z.object({
  domain: z.string().min(3, 'Domain is required').max(255),
});

// Helper to filter strictly approved public branding fields
function formatPublicBranding(school: School): PublicBranding {
  return {
    schoolId: school.id,
    schoolName: school.name,
    slug: school.slug,
    slogan: school.slogan,
    logoUrl: school.logoUrl,
    brandColor: school.brandColor || '#2563EB',
    secondaryColor: school.secondaryColor || '#1E293B',
    contactEmail: school.contactEmail,
    contactPhone: school.contactPhone,
    portalTitle: school.portalTitle || `${school.name} Portal`,
    customDomain: school.customDomainVerified ? school.customDomain : null,
    poweredBy: 'GlobePen',
  };
}

// ─── GET /api/schools/branding ───────────────────────────────────────
// Resolves portal branding strictly from the verified hostname.
// Client-supplied slugs or query parameters CANNOT override the portal hostname.

router.get('/branding', async (req: Request, res: Response) => {
  try {
    // 1. If request is on a verified school subdomain or custom domain:
    if (req.resolvedSchool) {
      // Re-fetch fresh public branding from DB
      const school = await prisma.school.findUnique({
        where: { id: req.resolvedSchool.id },
      });

      if (!school) {
        res.status(404).json({ error: 'School portal not found.' });
        return;
      }

      res.json({ branding: formatPublicBranding(school) });
      return;
    }

    // 2. If on central platform host, return GlobePen product branding
    // Optionally allows superadmins or public discovery of a school by slug ONLY on platform host
    const requestedSlug = typeof req.query.slug === 'string' ? req.query.slug.toLowerCase().trim() : null;
    if (requestedSlug) {
      const school = await prisma.school.findUnique({
        where: { slug: requestedSlug },
      });

      if (school) {
        res.json({ branding: formatPublicBranding(school) });
        return;
      }
    }

    // Fallback: GlobePen Default Platform Branding
    res.json({
      branding: {
        schoolId: null,
        schoolName: 'GlobePen',
        slug: null,
        slogan: 'School Management & Academic Operations',
        logoUrl: null,
        brandColor: '#2563EB',
        secondaryColor: '#1E293B',
        contactEmail: null,
        contactPhone: null,
        portalTitle: 'GlobePen Portal',
        customDomain: null,
        poweredBy: 'GlobePen',
      },
    });
  } catch (err) {
    console.error('[Branding Get Error]', err);
    res.status(500).json({ error: 'Failed to retrieve portal branding.' });
  }
});

// Session-scoped identity is also available on the platform hostname.
router.get('/identity', authenticate, enforceTenant, async (req, res) => {
  const school = await prisma.school.findUniqueOrThrow({ where: { id: req.user!.schoolId! } });
  res.json({ branding: formatPublicBranding(school), address: school.address });
});

router.get('/management', authenticate, enforceTenant, requireAdmin, async (req, res) => {
  const school = await prisma.school.findUniqueOrThrow({ where: { id: req.user!.schoolId! } });
  const response: SchoolManagementResponse = {
    branding: formatPublicBranding(school), address: school.address,
    domain: school.customDomain,
    verificationStatus: !school.customDomain ? 'not_registered' : school.customDomainVerified ? 'ownership_verified' : 'ownership_unverified',
    verifiedAt: school.domainVerifiedAt?.toISOString() ?? null,
    dnsChallenge: school.customDomain && school.domainVerificationToken ? {
      recordType: 'TXT', recordHost: `_globepen-challenge.${school.customDomain}`, recordValue: school.domainVerificationToken,
    } : null,
  };
  res.json(response);
});

// ─── PUT /api/schools/branding ───────────────────────────────────────
// School Admin updates branding & details for their current tenant.

router.put('/branding', authenticate, enforceTenant, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = updateBrandingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const schoolId = req.user!.schoolId!;
    const data = parsed.data;

    const updatedSchool = await prisma.$transaction(async (tx) => {
    const updated = await tx.school.update({
      where: { id: schoolId },
      data: {
        name: data.name,
        slogan: data.slogan,
        logoUrl: data.logoUrl,
        address: data.address,
        portalTitle: data.portalTitle,
        brandColor: data.brandColor,
        secondaryColor: data.secondaryColor,
        contactEmail: data.contactEmail === '' ? null : data.contactEmail,
        contactPhone: data.contactPhone,
      },
    });

    // Also sync SchoolSettings if present
    await tx.schoolSettings.upsert({
      where: { schoolId },
      update: {
        schoolName: data.name,
        schoolSlogan: data.slogan,
        brandColor: data.brandColor,
        logoBase64: data.logoUrl,
        address: data.address,
      },
      create: {
        schoolId,
        schoolName: updated.name,
        schoolSlogan: data.slogan,
        brandColor: data.brandColor,
        logoBase64: data.logoUrl,
        address: data.address,
      },
    });
    return updated;
    });

    res.json({
      message: 'Branding updated successfully.',
      branding: formatPublicBranding(updatedSchool),
    });
  } catch (err) {
    console.error('[Branding Update Error]', err);
    res.status(500).json({ error: 'Failed to update portal branding.' });
  }
});

// ─── POST /api/schools/custom-domain ─────────────────────────────────
// Registers or updates a custom domain and generates a DNS TXT challenge token.
// Resets verification status immediately on domain change.

router.post('/custom-domain', authenticate, enforceTenant, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = customDomainSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    // Registration accepts a hostname only, never a URL, port or path.
    const domain = parsed.data.domain.trim().toLowerCase().replace(/\.$/, '');

    // Validate domain syntax (FQDN format)
    const fqdnRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
    if (domain.length > 253 || !fqdnRegex.test(domain)) {
      res.status(400).json({
        error: 'Invalid domain format. Enter a fully qualified domain (e.g. portal.myschool.edu).',
      });
      return;
    }

    // Reject platform base domains and reserved words
    const baseDomains = getPlatformBaseDomains();
    for (const base of baseDomains) {
      if (domain === base || domain.endsWith(`.${base}`)) {
        res.status(400).json({
          error: `Domain '${domain}' is part of platform base domains. Use a distinct custom domain.`,
        });
        return;
      }
    }

    if (isPlatformHost(domain)) {
      res.status(400).json({ error: 'Cannot register a platform host as a school custom domain.' });
      return;
    }

    const schoolId = req.user!.schoolId!;

    // Check if domain is already registered by another school
    const existing = await prisma.school.findFirst({
      where: {
        customDomain: domain,
        NOT: { id: schoolId },
      },
    });

    if (existing) {
      res.status(409).json({ error: `Domain '${domain}' is already registered to another school.` });
      return;
    }

    // Generate fresh cryptographic DNS TXT verification token
    const verificationToken = `globepen-verify-${crypto.randomBytes(16).toString('hex')}`;

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        customDomain: domain,
        customDomainVerified: false, // Reset verification on registration/change
        domainVerificationToken: verificationToken,
        domainVerifiedAt: null,
      },
    });

    res.json({
      message: 'Custom domain registered. Add the DNS TXT record below to verify ownership.',
      domain,
      verificationStatus: 'ownership_unverified',
      dnsChallenge: {
        recordType: 'TXT',
        recordHost: `_globepen-challenge.${domain}`,
        recordValue: verificationToken,
      },
    } satisfies DomainRegistrationResponse);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      res.status(409).json({ error: 'Domain is already registered to another school.' });
      return;
    }
    console.error('[Custom Domain Register Error]', err);
    res.status(500).json({ error: 'Failed to register custom domain.' });
  }
});

// ─── POST /api/schools/custom-domain/verify ──────────────────────────
// Verifies DNS TXT ownership challenge.
// Separates ownership verification from live routing / TLS readiness.

router.post('/custom-domain/verify', authenticate, enforceTenant, requireAdmin, async (req: Request, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school || !school.customDomain || !school.domainVerificationToken) {
      res.status(400).json({ error: 'No custom domain pending verification.' });
      return;
    }

    const domain = school.customDomain;
    const challengeHost = `_globepen-challenge.${domain}`;
    const expectedToken = school.domainVerificationToken;

    let verified = false;

    // Ownership can only be established by DNS, never by a request-supplied token.
    let timeout: ReturnType<typeof setTimeout> | undefined;
      // Real DNS lookup with safe 5-second timeout
      try {
        const txtRecordsPromise = dns.promises.resolveTxt(challengeHost);
        const timeoutPromise = new Promise<never>((_, reject) =>
          { timeout = setTimeout(() => reject(new Error('DNS lookup timed out')), 5000); }
        );

        const records = (await Promise.race([txtRecordsPromise, timeoutPromise])) as string[][];
        // records is array of arrays of strings e.g. [ [ 'globepen-verify-...' ] ]
        for (const recordChunks of records) {
          const joined = recordChunks.join('');
          if (joined.trim() === expectedToken) {
            verified = true;
            break;
          }
        }
      } catch (dnsErr: any) {
        console.warn(`[DNS Verification Warning for ${challengeHost}]`, dnsErr?.message || dnsErr);
      } finally {
        clearTimeout(timeout);
      }

    if (!verified) {
      res.status(400).json({
        error: 'Domain ownership verification failed.',
        details: `Could not verify TXT record '${challengeHost}' matching challenge token. Check your DNS records and try again.`,
        verificationStatus: 'ownership_unverified',
        dnsChallenge: {
          recordType: 'TXT',
          recordHost: challengeHost,
          recordValue: expectedToken,
        },
      });
      return;
    }

    const verifiedAt = new Date();
    const result = await prisma.school.updateMany({
      where: { id: schoolId, customDomain: domain, domainVerificationToken: expectedToken },
      data: {
        customDomainVerified: true,
        domainVerifiedAt: verifiedAt,
      },
    });
    if (result.count !== 1) {
      res.status(409).json({ error: 'Domain or challenge changed during verification. Verify the current domain again.' });
      return;
    }

    res.json({
      message: 'Domain ownership verified successfully.',
      domain,
      verificationStatus: 'ownership_verified',
      verifiedAt: verifiedAt.toISOString(),
      deploymentNote:
        'Ownership is confirmed. Next step: ensure DNS CNAME/A records and TLS certificates are configured before directing production traffic.',
    } satisfies DomainVerificationResponse);
  } catch (err) {
    console.error('[Custom Domain Verify Error]', err);
    res.status(500).json({ error: 'Failed to verify custom domain.' });
  }
});

// ─── GET /api/schools/manifest ───────────────────────────────────────
// Install metadata for the current host. Tenant identity comes from the
// server-side hostname resolution (same trust path as /branding) — never from
// a client-supplied identifier. Only public branding fields are exposed.
// Icons are static GlobePen platform assets; no tenant data is involved.
// Served no-store so a cached manifest can never attach one school's identity
// to another host.
router.get('/manifest', async (req: Request, res: Response) => {
  try {
    const school = req.resolvedSchool;
    if (!school) {
      res.status(404).json({ error: 'No school portal for this host.' });
      return;
    }

    const name = school.name || 'School Portal';
    const manifest = {
      id: '/',
      name,
      short_name: name.slice(0, 12),
      description: school.slogan || `${name} portal`,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#FFFFFF',
      theme_color: school.brandColor || '#1E293B',
      lang: 'en',
      dir: 'ltr',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    };

    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(manifest);
  } catch (err) {
    console.error('[School Manifest Error]', err);
    res.status(500).json({ error: 'Failed to build install manifest.' });
  }
});

// ─── DELETE /api/schools/custom-domain ───────────────────────────────
// Removes custom domain registration and resets verification state.

router.delete('/custom-domain', authenticate, enforceTenant, requireAdmin, async (req: Request, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        customDomain: null,
        customDomainVerified: false,
        domainVerificationToken: null,
        domainVerifiedAt: null,
      },
    });

    res.json({ message: 'Custom domain removed successfully.' });
  } catch (err) {
    console.error('[Custom Domain Delete Error]', err);
    res.status(500).json({ error: 'Failed to remove custom domain.' });
  }
});

export default router;
