import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { normalizeHostname, isPlatformHost, extractSubdomainSlug } from '../config/domains.js';

export interface ResolvedSchool {
  id: string;
  name: string;
  slug: string | null;
  portalTitle: string | null;
  brandColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  slogan: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      resolvedSchool?: ResolvedSchool | null;
      isPlatformHost?: boolean;
    }
  }
}

/**
 * Server-Side Hostname Tenant Resolution Middleware
 * 
 * 1. Uses req.hostname (which respects trusted proxy configuration).
 * 2. Normalizes hostname and ignores ports.
 * 3. Matches against:
 *    - Explicitly configured platform hosts -> req.resolvedSchool = null
 *    - School subdomains (*.<baseDomain>) -> looks up School by slug
 *    - Verified custom domains -> looks up School by customDomain (verified only)
 * 4. Strictly REJECTS unknown hosts, unknown subdomains, and unverified custom domains
 *    with HTTP 404. Never silently falls back to platform host.
 */
export async function resolveTenantFromHostname(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const host = normalizeHostname(req.hostname);

  if (!host) {
    res.status(400).json({ error: 'Missing or invalid Host header.' });
    return;
  }

  // 1. Check if platform host (e.g. localhost in dev, globepen.com in prod)
  if (isPlatformHost(host)) {
    req.isPlatformHost = true;
    req.resolvedSchool = null;
    next();
    return;
  }

  // 2. Check if school subdomain (e.g. alpha.localhost, greenwood.globepen.com)
  const slug = extractSubdomainSlug(host);
  if (slug) {
    try {
      const school = await prisma.school.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          portalTitle: true,
          brandColor: true,
          secondaryColor: true,
          logoUrl: true,
          slogan: true,
          address: true,
          contactEmail: true,
          contactPhone: true,
          customDomain: true,
          customDomainVerified: true,
        },
      });

      if (!school) {
        res.status(404).json({ error: `School portal '${slug}' does not exist.` });
        return;
      }

      req.isPlatformHost = false;
      req.resolvedSchool = school;
      next();
      return;
    } catch (err) {
      console.error('[Hostname Tenant Resolution Error]', err);
      res.status(500).json({ error: 'Failed to resolve school portal.' });
      return;
    }
  }

  // 3. Check if verified custom domain (e.g. portal.myschool.edu)
  try {
    const school = await prisma.school.findFirst({
      where: {
        customDomain: host,
        customDomainVerified: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        portalTitle: true,
        brandColor: true,
        secondaryColor: true,
        logoUrl: true,
        slogan: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        customDomain: true,
        customDomainVerified: true,
      },
    });

    if (school) {
      req.isPlatformHost = false;
      req.resolvedSchool = school;
      next();
      return;
    }
  } catch (err) {
    console.error('[Custom Domain Lookup Error]', err);
    res.status(500).json({ error: 'Failed to resolve custom domain.' });
    return;
  }

  // 4. Reject unknown host / unverified custom domain
  res.status(404).json({
    error: `Unrecognized host or unverified domain: '${host}'. This host is not mapped to any active school portal.`,
  });
}
