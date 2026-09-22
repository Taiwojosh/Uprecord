/**
 * Domain & Hostname Configuration for GlobePen Multi-Tenant SaaS
 * 
 * Enforces:
 * 1. Normalized hostnames without port or trailing dots
 * 2. Explicitly configured platform hostnames and base domains (no assumed domain ownership)
 * 3. Localhost allowed ONLY in non-production
 * 4. Configurable proxy trust settings (never hardcoded)
 */

export function normalizeHostname(rawHost?: string | null): string {
  if (!rawHost || typeof rawHost !== 'string') {
    return '';
  }

  let host = rawHost.trim().toLowerCase();

  // Strip IPv6 brackets if present e.g. [::1]:3000 -> [::1]
  if (host.startsWith('[')) {
    const closeBracket = host.indexOf(']');
    if (closeBracket !== -1) {
      host = host.slice(1, closeBracket);
    }
  } else {
    // Strip port e.g. "greenwood.localhost:3000" -> "greenwood.localhost"
    const colonIdx = host.indexOf(':');
    if (colonIdx !== -1) {
      host = host.slice(0, colonIdx);
    }
  }

  // Strip trailing dot if present (FQDN)
  if (host.endsWith('.')) {
    host = host.slice(0, -1);
  }

  return host;
}

/**
 * Returns exact hostnames recognized as the central platform (superadmin / platform portal).
 */
export function getPlatformHosts(): string[] {
  const hosts = new Set<string>();

  // Only allow localhost in non-production
  if (process.env.NODE_ENV !== 'production') {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
    hosts.add('::1');
  }

  if (process.env.PLATFORM_HOSTS) {
    const configured = process.env.PLATFORM_HOSTS.split(',')
      .map((h) => normalizeHostname(h))
      .filter(Boolean);
    configured.forEach((h) => hosts.add(h));
  }

  return Array.from(hosts);
}

/**
 * Returns configured base domains for school subdomains (e.g., *.globepen.com, *.globepen.local).
 */
export function getPlatformBaseDomains(): string[] {
  const bases = new Set<string>();

  // In non-production, allow .localhost, .local, and test domains
  if (process.env.NODE_ENV !== 'production') {
    bases.add('localhost');
    bases.add('globepen.local');
    bases.add('uprecord.edu');
    bases.add('uprecord.local');
  }

  if (process.env.PLATFORM_BASE_DOMAINS) {
    const configured = process.env.PLATFORM_BASE_DOMAINS.split(',')
      .map((b) => normalizeHostname(b))
      .filter(Boolean);
    configured.forEach((b) => bases.add(b));
  }

  return Array.from(bases);
}

/**
 * Returns trusted proxy configuration for Express.
 * Returns false (untrusted) by default unless explicitly configured.
 */
export function getTrustedProxySetting(): boolean | string | number {
  const envVal = process.env.TRUSTED_PROXIES;
  if (!envVal || envVal.toLowerCase() === 'false') {
    return false;
  }
  if (envVal.toLowerCase() === 'true') {
    return true;
  }
  const parsedNum = Number(envVal);
  if (!isNaN(parsedNum)) {
    return parsedNum;
  }
  return envVal; // e.g. "loopback, linklocal, 10.0.0.0/8"
}

/**
 * Checks if a normalized hostname is an explicitly allowed platform host.
 */
export function isPlatformHost(hostname: string): boolean {
  const norm = normalizeHostname(hostname);
  return getPlatformHosts().includes(norm);
}

/**
 * Extracts school subdomain slug if hostname is a valid subdomain of a platform base domain.
 * Example:
 *   "alpha.localhost" (base "localhost") -> "alpha"
 *   "greenwood.globepen.com" (base "globepen.com") -> "greenwood"
 * Returns null if not a subdomain of any base domain.
 */
export function extractSubdomainSlug(hostname: string): string | null {
  const norm = normalizeHostname(hostname);
  const baseDomains = getPlatformBaseDomains();

  for (const base of baseDomains) {
    const suffix = `.${base}`;
    if (norm.endsWith(suffix)) {
      const prefix = norm.slice(0, norm.length - suffix.length);
      // Ensure single-level subdomain without dots, alphanumeric + hyphen only
      if (prefix && !prefix.includes('.') && /^[a-z0-9-]+$/.test(prefix)) {
        return prefix;
      }
    }
  }

  return null;
}
